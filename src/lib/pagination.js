// Build the list of page tokens to render in the pager. Returns page numbers
// (1-based) interleaved with '…' ellipsis tokens. Keeps the first and last
// page plus the current page's neighbours; collapses the rest with ellipses
// once there are more than 7 pages.
export function getPageNumbers(currentPage, totalPages) {
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }

  pages.push(1);
  if (currentPage > 3) pages.push('…');
  for (
    let i = Math.max(2, currentPage - 1);
    i <= Math.min(totalPages - 1, currentPage + 1);
    i++
  ) {
    pages.push(i);
  }
  if (currentPage < totalPages - 2) pages.push('…');
  pages.push(totalPages);
  return pages;
}
