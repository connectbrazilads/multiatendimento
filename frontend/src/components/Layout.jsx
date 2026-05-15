import React, { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { SOCKET_URL } from '../services/socket';
import {
  MessageSquare,
  MessageCircle,
  LayoutDashboard,
  Settings,
  Users,
  Link as LinkIcon,
  HelpCircle,
  Megaphone,
  Sun,
  Moon,
  LogOut,
  FileText,
  ShieldCheck,
  Zap,
  Bell,
  ChevronDown,
} from 'lucide-react';
import { getMe, getMediaUrl } from '../services/api';
import { useIsMobile } from '../hooks/useIsMobile';
import ToastContainer from './ToastContainer';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [notification, setNotification] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const audioRef = React.useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'));
  const desktopMenuRef = React.useRef(null);
  const role = localStorage.getItem('role')?.toLowerCase();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const isMobile = useIsMobile();

  function getNotificationBody(message) {
    const text = message?.body?.trim();
    if (text) return text;

    const mediaLabels = {
      image: 'Imagem recebida',
      video: 'Video recebido',
      audio: 'Audio recebido',
      document: 'Documento recebido',
      sticker: 'Sticker recebido',
    };

    return mediaLabels[message?.mediaType] || 'Nova mensagem recebida';
  }

  function logout() {
    localStorage.clear();
    navigate('/login');
  }

  React.useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
    localStorage.setItem('theme', theme);
  }, [theme]);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const tenantId = localStorage.getItem('tenantId');
    if (!tenantId) return undefined;

    getMe()
      .then((res) => setTenant(res.data.tenant))
      .catch(() => {});

    const token = localStorage.getItem('token');
    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnectionDelayMax: 10000,
    });

    socket.on('new_message', ({ message, contact, fromMe }) => {
      if (fromMe) return;

      const notificationBody = getNotificationBody(message);
      audioRef.current.play().catch(() => {});
      setNotification({ name: contact?.name || contact?.phone || 'Contato', body: notificationBody });
      setTimeout(() => setNotification(null), 5000);

      if (typeof window !== 'undefined' && window.Notification && Notification.permission === 'granted') {
        new Notification(`Nova mensagem de ${contact?.name || contact?.phone || 'Contato'}`, {
          body: notificationBody,
          icon: '/logo192.png',
        });
      }
    });

    socket.on('new_internal', (msg) => {
      const myId = localStorage.getItem('userId');
      if (msg.senderId === myId) return;

      audioRef.current.play().catch(() => {});
      setNotification({
        name: `Equipe: ${msg.sender?.name || 'Colega'}`,
        body: msg.body,
        isInternal: true,
      });
      setTimeout(() => setNotification(null), 5000);

      if (typeof window !== 'undefined' && window.Notification && Notification.permission === 'granted') {
        new Notification(`Equipe: ${msg.sender?.name || 'Colega'}`, { body: msg.body });
      }
    });

    return () => socket.disconnect();
  }, []);

  React.useEffect(() => {
    function handlePointerDown(event) {
      if (desktopMenuRef.current && !desktopMenuRef.current.contains(event.target)) {
        setDesktopMenuOpen(false);
      }
    }

    if (desktopMenuOpen) {
      document.addEventListener('mousedown', handlePointerDown);
    }

    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [desktopMenuOpen]);

  React.useEffect(() => {
    setDesktopMenuOpen(false);
  }, [location.pathname]);

  const desktopLinks = [
    { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard', roles: ['admin', 'agent', 'superadmin'] },
    { to: '/inbox', icon: <MessageSquare size={18} />, label: 'Chat', roles: ['admin', 'agent', 'superadmin'] },
    { to: '/internal-chat', icon: <MessageCircle size={18} />, label: 'Chat Interno', roles: ['admin', 'agent', 'superadmin'] },
    { to: '/connections', icon: <LinkIcon size={18} />, label: 'Conexoes', roles: ['admin', 'agent', 'superadmin'] },
    { to: '/contacts', icon: <Users size={18} />, label: 'Clientes / CRM', roles: ['admin', 'agent', 'superadmin'] },
    { to: '/campaigns', icon: <Megaphone size={18} />, label: 'Campanhas', roles: ['admin', 'agent', 'superadmin'] },
    { to: '/quick-responses', icon: <Zap size={18} />, label: 'Respostas Rapidas', roles: ['admin', 'agent', 'superadmin'] },
    { to: '/os', icon: <FileText size={18} />, label: 'O.S. / CRM', roles: ['admin', 'agent', 'superadmin'] },
    { to: '/knowledge', icon: <HelpCircle size={18} />, label: 'Treinamento IA', roles: ['admin', 'agent', 'superadmin'] },
    { to: '/settings', icon: <Settings size={18} />, label: 'Ajustes', roles: ['admin', 'superadmin'] },
    { to: '/superadmin', icon: <ShieldCheck size={18} />, label: 'Painel Admin', roles: ['superadmin'] },
  ];

  const visibleDesktopLinks = desktopLinks.filter((link) => link.roles.includes(role));
  const primaryDesktopRoutes = ['/dashboard', '/inbox', '/internal-chat', '/connections', '/contacts', '/campaigns'];
  const primaryDesktopLinks = visibleDesktopLinks.filter((link) => primaryDesktopRoutes.includes(link.to));
  const secondaryDesktopLinks = visibleDesktopLinks.filter((link) => !primaryDesktopRoutes.includes(link.to));
  const secondaryMenuActive = secondaryDesktopLinks.some((link) => location.pathname === link.to);

  const mobileLinks = [
    { to: '/dashboard', icon: <LayoutDashboard size={22} />, label: 'Dash' },
    { to: '/inbox', icon: <MessageSquare size={22} />, label: 'Chat' },
    { to: '/contacts', icon: <Users size={22} />, label: 'Clientes' },
    { to: '/settings', icon: <Settings size={22} />, label: 'Ajustes' },
  ];

  return (
    <div style={styles.root}>
      <style>{`
        .desktop-nav-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <nav style={{ ...styles.nav, padding: isMobile ? '0 1rem' : '0 1.5rem' }}>
        <div style={styles.brandGroup}>
          {tenant?.logoUrl ? (
            <img
              src={getMediaUrl(tenant.logoUrl)}
              alt="Logo"
              style={{
                height: isMobile ? '32px' : '40px',
                width: 'auto',
                objectFit: 'contain',
                borderRadius: '10px',
              }}
            />
          ) : (
            <>
              <span style={styles.brandIcon}>MA</span>
              <span style={{ ...styles.brand, fontSize: isMobile ? '0.92rem' : '1.05rem' }}>
                Multiatendimento <span style={styles.proTag}>PRO</span>
              </span>
            </>
          )}
        </div>

        {!isMobile ? (
          <div style={styles.centerNav}>
            <div style={{ ...styles.links }} className="desktop-nav-scroll">
              {primaryDesktopLinks.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.to === '/dashboard'} style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.linkActive : {}) })}>
                  {link.icon}
                  {link.label}
                </NavLink>
              ))}
            </div>

            {secondaryDesktopLinks.length > 0 ? (
              <div ref={desktopMenuRef} style={styles.moreMenuWrap}>
                <button
                  type="button"
                  onClick={() => setDesktopMenuOpen((previous) => !previous)}
                  style={{ ...styles.link, ...styles.moreMenuBtn, ...((desktopMenuOpen || secondaryMenuActive) ? styles.linkActive : {}) }}
                >
                  Mais
                  <ChevronDown size={16} style={{ transform: desktopMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                </button>

                {desktopMenuOpen ? (
                  <div style={styles.moreMenuDropdown}>
                    {secondaryDesktopLinks.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        end={link.to === '/dashboard'}
                        onClick={() => setDesktopMenuOpen(false)}
                        style={({ isActive }) => ({
                          ...styles.moreMenuItem,
                          ...(isActive ? styles.moreMenuItemActive : {}),
                        })}
                      >
                        {link.icon}
                        {link.label}
                      </NavLink>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div style={styles.rightActions}>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={styles.themeBtn} title="Alternar tema">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button style={{ ...styles.logout, padding: isMobile ? '0.45rem 0.85rem' : '0.55rem 1rem' }} onClick={logout}>
            {isMobile ? <LogOut size={18} /> : 'Sair'}
          </button>
        </div>
      </nav>

      <div style={{ ...styles.content, paddingBottom: isMobile ? '74px' : '0' }}>
        <Outlet />
      </div>

      {isMobile ? (
        <div style={styles.bottomNav}>
          {mobileLinks.map((link) => (
            <NavLink key={link.to} to={link.to} style={({ isActive }) => ({ ...styles.bottomLink, ...(isActive ? styles.bottomLinkActive : {}) })}>
              {link.icon}
              <span style={styles.bottomLabel}>{link.label}</span>
            </NavLink>
          ))}
        </div>
      ) : null}

      {notification ? (
        <div
          style={{ ...styles.toast, right: isMobile ? '1rem' : '2rem', left: isMobile ? '1rem' : 'auto' }}
          onClick={() => {
            navigate(notification.isInternal ? '/internal-chat' : '/inbox');
            setNotification(null);
          }}
        >
          <div style={styles.toastIcon}>
            <Bell size={18} color="var(--accent)" />
          </div>
          <div style={styles.toastBody}>
            <div style={styles.toastName}>{notification.name}</div>
            <div style={styles.toastMsg}>
              {notification.body.length > 64 ? `${notification.body.slice(0, 64)}...` : notification.body}
            </div>
          </div>
        </div>
      ) : null}

      <ToastContainer />
    </div>
  );
}

const styles = {
  root: { display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-base)' },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    height: '68px',
    background: 'var(--bg-panel)',
    borderBottom: '1px solid var(--border-color)',
    color: 'var(--text-main)',
    flexShrink: 0,
  },
  brandGroup: { display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 },
  brandIcon: {
    width: '34px',
    height: '34px',
    borderRadius: '12px',
    background: 'var(--accent)',
    color: 'var(--text-inverse)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    fontSize: '0.8rem',
    letterSpacing: '0.04em',
  },
  brand: { fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' },
  proTag: { color: 'var(--accent)', fontSize: '0.62rem', verticalAlign: 'top', marginLeft: '0.2rem' },
  centerNav: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.65rem', justifyContent: 'center' },
  links: { display: 'flex', gap: '0.45rem', minWidth: 0, overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' },
  link: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    color: 'var(--text-muted)',
    textDecoration: 'none',
    padding: '0.55rem 0.9rem',
    borderRadius: '12px',
    fontSize: '0.88rem',
    fontWeight: 600,
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  linkActive: {
    background: 'var(--accent-light)',
    color: 'var(--accent)',
    fontWeight: 700,
    boxShadow: 'inset 0 0 0 1px var(--accent-border)',
  },
  moreMenuWrap: { position: 'relative', flexShrink: 0 },
  moreMenuBtn: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)' },
  moreMenuDropdown: {
    position: 'absolute',
    top: 'calc(100% + 0.6rem)',
    right: 0,
    minWidth: '220px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: '18px',
    padding: '0.5rem',
    boxShadow: '0 20px 40px rgba(0,0,0,0.22)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    zIndex: 1200,
  },
  moreMenuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.75rem 0.9rem',
    borderRadius: '12px',
    textDecoration: 'none',
    color: 'var(--text-muted)',
    fontWeight: 700,
    fontSize: '0.88rem',
  },
  moreMenuItemActive: {
    background: 'var(--accent-light)',
    color: 'var(--accent)',
    boxShadow: 'inset 0 0 0 1px var(--accent-border)',
  },
  rightActions: { display: 'flex', alignItems: 'center', gap: '0.8rem', flexShrink: 0 },
  themeBtn: {
    background: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '38px',
    height: '38px',
    borderRadius: '12px',
  },
  logout: {
    background: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    display: 'inline-flex',
    alignItems: 'center',
    fontWeight: 700,
  },
  content: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '74px',
    background: 'var(--bg-panel)',
    borderTop: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 1000,
  },
  bottomLink: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    textDecoration: 'none',
    color: 'var(--text-dim)',
    padding: '0.45rem 0.6rem',
    borderRadius: '14px',
  },
  bottomLinkActive: {
    color: 'var(--accent)',
    background: 'var(--accent-light)',
  },
  bottomLabel: { fontSize: '0.65rem', fontWeight: 700 },
  toast: {
    position: 'fixed',
    top: '84px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--accent-border)',
    padding: '0.95rem 1rem',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
    zIndex: 9999,
    cursor: 'pointer',
    animation: 'slideIn 0.3s ease-out',
    maxWidth: '24rem',
  },
  toastIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '12px',
    background: 'var(--accent-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  toastBody: { minWidth: 0 },
  toastName: { fontWeight: 800, color: 'var(--text-main)', fontSize: '0.9rem' },
  toastMsg: { color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px', lineHeight: 1.45 },
};
