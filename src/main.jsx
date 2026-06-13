import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.jsx';
import PartsView from './pages/PartsView.jsx';
import BOMsView from './pages/BOMsView.jsx';
import BOMDetail from './pages/BOMDetail.jsx';
import TemplatesView from './pages/TemplatesView.jsx';
import './index.css';

const router = createBrowserRouter([
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
