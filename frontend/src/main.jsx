import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import api from './services/api';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Inbox = lazy(() => import('./pages/Inbox'));
const Contacts = lazy(() => import('./pages/Contacts'));
const Users = lazy(() => import('./pages/Users'));
const Teams = lazy(() => import('./pages/Teams'));
const Settings = lazy(() => import('./pages/Settings'));
const InternalChat = lazy(() => import('./pages/InternalChat'));
const Connections = lazy(() => import('./pages/Connections'));
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
const ServiceOrders = lazy(() => import('./pages/ServiceOrders'));
const QuickResponses = lazy(() => import('./pages/QuickResponses'));
const SuperAdmin = lazy(() => import('./pages/SuperAdmin'));

// Interceptor global para tratar erros de autenticacao (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        color: 'var(--text-muted)',
        fontWeight: 700,
        letterSpacing: '0.04em',
      }}
    >
      Carregando...
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/:slug/login" element={<Login />} />

        <Route
          element={(
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          )}
        >
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
    </Suspense>
  </BrowserRouter>
);
