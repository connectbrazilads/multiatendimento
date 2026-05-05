import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import Inbox from './pages/Inbox';
import Settings from './pages/Settings';
import Users from './pages/Users';
import Teams from './pages/Teams';
import Dashboard from './pages/Dashboard';
import InternalChat from './pages/InternalChat';
import SuperAdmin from './pages/SuperAdmin';
import Connections from './pages/Connections';
import LandingPage from './pages/LandingPage';
import KnowledgeBase from './pages/KnowledgeBase';
import Campaigns from './pages/Campaigns';
import Contacts from './pages/Contacts';
import ServiceOrders from './pages/ServiceOrders';
import QuickResponses from './pages/QuickResponses';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/:slug/login" element={<Login />} />
      
      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route index element={<Dashboard />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/users" element={<Users />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/internal-chat" element={<InternalChat />} />
        <Route path="/connections" element={<Connections />} />
        <Route path="/knowledge" element={<KnowledgeBase />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/os" element={<ServiceOrders />} />
        <Route path="/quick-responses" element={<QuickResponses />} />
        <Route path="/superadmin" element={<SuperAdmin />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);
