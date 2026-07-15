import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, createHashRouter, RouterProvider } from 'react-router-dom';
import App from './App.jsx';
import PartsView from './pages/PartsView.jsx';
import BOMsView from './pages/BOMsView.jsx';
import BOMDetail from './pages/BOMDetail.jsx';
import TemplatesView from './pages/TemplatesView.jsx';
import './index.css';

// The single-file demo build (VITE_HASH_ROUTER=1) can't rely on server path
// routing, so it uses a hash router and lands on the demo BOM.
const useHashRouter =
  import.meta.env.VITE_HASH_ROUTER === '1' || import.meta.env.VITE_HASH_ROUTER === 'true';
if (useHashRouter && !window.location.hash) {
  window.location.hash = '/boms/demo-bom';
}
const createRouter = useHashRouter ? createHashRouter : createBrowserRouter;

const router = createRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <PartsView /> },
      { path: 'category/:category', element: <PartsView /> },
      { path: 'boms', element: <BOMsView /> },
      { path: 'boms/:id', element: <BOMDetail /> },
      { path: 'templates', element: <TemplatesView /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
