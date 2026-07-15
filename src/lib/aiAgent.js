// Deterministic, rules-grounded BOM assistant engine.
//
// Design goals (per product spec):
//  1. The agent selects parts ONLY by following taught rules + knowledge that a
//     user has explicitly added. It never invents parts or free-generates a
//     bill of materials from a language model.
//  2. It references "official information" — the taught rules and knowledge
//     entries — and surfaces them as citations so the user can see *why* a part
//     was proposed.
//  3. When the request is ambiguous or unmatched, it asks a clarifying question
//     and returns no candidates, waiting for the user to answer or teach a rule.
//  4. It produces a transparent "deep thinking" reasoning trace.
//
// Everything here is a pure function so it can be unit-tested without React or
// Firestore.

const norm = (s) => (s == null ? '' : String(s)).toLowerCase().trim();

// Rule data shape (stored in Firestore `aiRules`):
//   { id, name, enabled,
//     triggers: string[],          // phrases that activate the rule
//     requires: string[],          // params that must be known: 'brand'|'category'|'qty'
//     filters: { categories: [], brands: [], partNos: [], textIncludes: [] },
//     defaultQty: number,
//     note: string }               // official reference / explanation
//
// Knowledge data shape (Firestore `aiKnowledge`):
//   { id, title, content, source }

export function ruleFilters(rule) {
  const f = rule?.filters || {};
  return {
    categories: (f.categories || []).map(norm).filter(Boolean),
    brands: (f.brands || []).map(norm).filter(Boolean),
    partNos: (f.partNos || []).map(norm).filter(Boolean),
    textIncludes: (f.textIncludes || []).map(norm).filter(Boolean),
  };
}

function filterIsEmpty(f) {
  return (
    f.categories.length === 0 &&
    f.brands.length === 0 &&
    f.partNos.length === 0 &&
    f.textIncludes.length === 0
  );
}

// Does a single part satisfy a rule's filter? AND across the dimensions that are
// present, OR within a dimension. An all-empty filter matches nothing (so a rule
// can never accidentally select the entire library).
export function partMatchesFilter(part, f) {
  if (filterIsEmpty(f)) return false;
  const brand = norm(part.brand);
  const category = norm(part.category);
  const partNo = norm(part.partNo);
  const desc = norm(part.description);

  if (f.categories.length && !f.categories.includes(category)) return false;
  if (f.brands.length && !f.brands.includes(brand)) return false;
  if (f.partNos.length && !f.partNos.includes(partNo)) return false;
  if (f.textIncludes.length && !f.textIncludes.some((t) => desc.includes(t))) return false;
  return true;
}

// Pull structured context out of the free-text prompt using ONLY vocabulary that
// exists in the parts library (brands, categories) plus an explicit quantity.
// This keeps the agent grounded — it recognises a brand because that brand is
// real, not because a model guessed one.
export function extractContext(prompt, parts) {
  const p = norm(prompt);
  const brandSet = new Set();
  const catSet = new Set();
  for (const part of parts || []) {
    const b = norm(part.brand);
    const c = norm(part.category);
    if (b) brandSet.add(b);
    if (c) catSet.add(c);
  }

  const brands = [...brandSet].filter((b) => b.length >= 2 && p.includes(b));
  const categories = [...catSet].filter((c) => c.length >= 2 && p.includes(c));

  // Quantity: "3 pcs", "x5", "qty 10", "10 ตัว/อัน/ชิ้น". Deliberately narrow so a
  // part number like "AB-1756" is never mistaken for a quantity.
  let qty = null;
  const qtyPatterns = [
    /\bx\s*(\d{1,5})\b/,
    /\bqty\.?\s*(\d{1,5})\b/,
    /\bquantity\s*(\d{1,5})\b/,
    /\b(\d{1,5})\s*(?:x|pcs?|pieces?|units?|nos?|ตัว|อัน|ชิ้น)\b/,
  ];
  for (const re of qtyPatterns) {
    const m = p.match(re);
    if (m) {
      qty = parseInt(m[1], 10);
      break;
    }
  }

  return { brands, categories, qty };
}

// Score how well a rule matches the prompt: number of triggers found, weighted
// by trigger length (longer, more specific phrases rank higher).
export function scoreRule(rule, promptNorm) {
  const triggers = (rule.triggers || []).map(norm).filter(Boolean);
  const matched = triggers.filter((t) => promptNorm.includes(t));
  const score = matched.reduce((sum, t) => sum + t.length, 0);
  return { matched, score };
}

function requirementSatisfied(req, rule, ctx) {
  const f = ruleFilters(rule);
  switch (req) {
    case 'brand':
      return ctx.brands.length > 0 || f.brands.length > 0;
    case 'category':
      return ctx.categories.length > 0 || f.categories.length > 0;
    case 'qty':
      return ctx.qty != null || rule.defaultQty != null;
    default:
      return true;
  }
}

const REQUIRE_QUESTION = {
  brand: 'which brand do you want?',
  category: 'which category should I pick from?',
  qty: 'how many do you need?',
};

// Main entry point.
// Returns:
//   {
//     reasoning: string[],          // deep-thinking trace
//     question: string | null,      // set => ask the user and wait
//     notice: string | null,        // informational (matched but nothing found)
//     candidates: [{ partId, qty, ruleName, reason, part }],
//     citations: [{ title, content, source }],
//     matchedRules: [{ id, name, score, matched }],
//   }
export function runAgent({ prompt, rules = [], knowledge = [], parts = [] }) {
  const reasoning = [];
  const promptNorm = norm(prompt);

  if (!promptNorm) {
    return {
      reasoning,
      question: 'What would you like to add to this BOM?',
      notice: null,
      candidates: [],
      citations: [],
      matchedRules: [],
    };
  }

  reasoning.push(`Read the request: "${prompt.trim()}".`);

  const enabledRules = rules.filter((r) => r.enabled !== false);
  reasoning.push(
    `Consulting ${enabledRules.length} taught rule${enabledRules.length === 1 ? '' : 's'} — I only act on rules you've taught, never on my own guesses.`
  );

  const ctx = extractContext(prompt, parts);
  const ctxBits = [];
  if (ctx.brands.length) ctxBits.push(`brand → ${ctx.brands.join(', ')}`);
  if (ctx.categories.length) ctxBits.push(`category → ${ctx.categories.join(', ')}`);
  if (ctx.qty != null) ctxBits.push(`quantity → ${ctx.qty}`);
  reasoning.push(
    ctxBits.length
      ? `Recognised from the parts library: ${ctxBits.join('; ')}.`
      : 'No specific brand, category or quantity recognised in the request yet.'
  );

  // Rank rules by trigger match.
  const scored = enabledRules
    .map((r) => ({ rule: r, ...scoreRule(r, promptNorm) }))
    .filter((s) => s.matched.length > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    reasoning.push('No taught rule matches this request — I will not guess.');
    return {
      reasoning,
      question:
        `I don't have a taught rule that matches "${prompt.trim()}", so I won't guess. ` +
        `You can rephrase using words from a rule's triggers, tell me the category/brand, ` +
        `or open "Teach AI" to add a rule for this.`,
      notice: null,
      candidates: [],
      citations: [],
      matchedRules: [],
    };
  }

  const matchedRules = scored.map((s) => ({
    id: s.rule.id,
    name: s.rule.name,
    score: s.score,
    matched: s.matched,
  }));
  reasoning.push(
    `Matched rule${scored.length === 1 ? '' : 's'}: ${scored
      .map((s) => `“${s.rule.name}”`)
      .join(', ')}.`
  );

  // Check clarifying requirements — driven by the top (most specific) rule.
  const top = scored[0].rule;
  const missing = (top.requires || []).filter(
    (req) => !requirementSatisfied(req, top, ctx)
  );
  if (missing.length > 0) {
    const questions = missing.map((m) => REQUIRE_QUESTION[m] || `please specify ${m}`);
    reasoning.push(
      `Rule “${top.name}” needs more detail before I can select parts: ${missing.join(', ')}.`
    );
    return {
      reasoning,
      question:
        `Before I select parts for “${top.name}”, I need to clarify — ` +
        questions.join(' And ') +
        ' Please answer and I\'ll continue.',
      notice: null,
      candidates: [],
      citations: [],
      matchedRules,
    };
  }

  // Gather candidates from every matched rule, narrowed by any brand/category the
  // user explicitly named in the prompt.
  const byId = new Map();
  for (const { rule } of scored) {
    const f = ruleFilters(rule);
    if (filterIsEmpty(f)) {
      reasoning.push(
        `Rule “${rule.name}” has no filters set, so it can't point at any parts — skipping it.`
      );
      continue;
    }
    const qty = ctx.qty ?? rule.defaultQty ?? 1;
    for (const part of parts) {
      if (!partMatchesFilter(part, f)) continue;
      // Narrow by explicit prompt context.
      if (ctx.brands.length && !ctx.brands.includes(norm(part.brand))) continue;
      if (ctx.categories.length && !ctx.categories.includes(norm(part.category))) continue;
      if (byId.has(part.id)) continue;
      byId.set(part.id, {
        partId: part.id,
        qty,
        ruleName: rule.name,
        reason: `Rule “${rule.name}”`,
        part,
      });
    }
  }

  const candidates = [...byId.values()];

  // Citations: matched-rule notes (the "official reference" behind each rule) +
  // any knowledge entry whose title words appear in the prompt.
  const citations = [];
  for (const { rule } of scored) {
    if (rule.note && rule.note.trim()) {
      citations.push({ title: `Rule: ${rule.name}`, content: rule.note.trim(), source: 'Taught rule' });
    }
  }
  for (const k of knowledge) {
    const words = norm(k.title).split(/\s+/).filter((w) => w.length >= 3);
    if (words.some((w) => promptNorm.includes(w))) {
      citations.push({ title: k.title, content: k.content, source: k.source || 'Knowledge base' });
    }
  }

  if (candidates.length === 0) {
    reasoning.push(
      'The matched rule(s) resolved, but no parts in the library fit the filters after narrowing.'
    );
    return {
      reasoning,
      question: null,
      notice:
        'I matched your request to a taught rule, but no parts in the library fit its filters. ' +
        'Try broadening the rule (Teach AI) or adding the parts to the library first.',
      candidates: [],
      citations,
      matchedRules,
    };
  }

  reasoning.push(
    `Selected ${candidates.length} part${candidates.length === 1 ? '' : 's'} from the library that satisfy the rule filters.`
  );

  return { reasoning, question: null, notice: null, candidates, citations, matchedRules };
}
