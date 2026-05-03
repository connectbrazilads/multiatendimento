import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { SOCKET_URL } from '../services/socket';
import { MessageSquare, LayoutDashboard, Settings, Users, Link as LinkIcon, HelpCircle, Megaphone, Sun, Moon, LogOut } from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();

  const [notification, setNotification] = useState(null);
  const audioRef = React.useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'));

  function logout() {
    localStorage.clear();
    navigate('/login');
  }

  const role = localStorage.getItem('role');

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  React.useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
    localStorage.setItem('theme', theme);
  }, [theme]);

  React.useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const tenantId = localStorage.getItem('tenantId');
    if (tenantId) {
      const token = localStorage.getItem('token');
      const s = io(SOCKET_URL, { 
        auth: { token },
        reconnectionDelayMax: 10000,
      });

      s.on('new_message', ({ message, contact, fromMe }) => {
        if (fromMe) return;
        
        // Toca som
        audioRef.current.play().catch(() => {});
        
        // Mostra Toast (Visual Interno)
        setNotification({ name: contact.name || contact.phone, body: message.body });
        setTimeout(() => setNotification(null), 5000);

        // Notificação de Navegador (Background)
        if (Notification.permission === 'granted') {
          new Notification(`Nova mensagem de ${contact.name || contact.phone}`, {
            body: message.body,
            icon: '/logo192.png'
          });
        }
      });

      s.on('new_internal', (msg) => {
        const myId = localStorage.getItem('userId');
        if (msg.senderId === myId) return;

        audioRef.current.play().catch(() => {});
        setNotification({ 
          name: `Equipe: ${msg.sender?.name || 'Colega'}`, 
          body: msg.body, 
          isInternal: true 
        });
        setTimeout(() => setNotification(null), 5000);

        if (Notification.permission === 'granted') {
          new Notification(`Equipe: ${msg.sender?.name || 'Colega'}`, { body: msg.body });
        }
      });

      return () => s.disconnect();
    }
  }, []);

  const isMobile = window.innerWidth <= 768;

  const mobileLinks = [
    { to: '/dashboard', icon: <LayoutDashboard size={24} />, label: 'Dash' },
    { to: '/inbox', icon: <MessageSquare size={24} />, label: 'Chat' },
    { to: '/contacts', icon: <Users size={24} />, label: 'Contatos' },
    { to: '/settings', icon: <Settings size={24} />, label: 'Ajustes' },
  ];

  return (
    <div style={styles.root}>
      <nav style={{ ...styles.nav, padding: isMobile ? '0 1rem' : '0 2rem' }}>
        <div style={styles.brandGroup}>
          <span style={styles.brandIcon}>✨</span>
          <span style={{ ...styles.brand, fontSize: isMobile ? '0.9rem' : '1.1rem' }}>
            {isMobile ? 'Multiatendimento' : 'Multiatendimento'} <span style={{ color: '#D4AF37', fontSize: '0.6rem', verticalAlign: 'top' }}>PRO</span>
          </span>
        </div>
        
        {!isMobile && (
          <div style={styles.links}>
            <NavLink to="/dashboard" end style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.linkActive : {}) })}>
              <LayoutDashboard size={18} /> Dashboard
            </NavLink>
            <NavLink to="/inbox" style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.linkActive : {}) })}>
              <MessageSquare size={18} /> Chat
            </NavLink>
            <NavLink to="/connections" style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.linkActive : {}) })}>
              <LinkIcon size={18} /> Conexões
            </NavLink>
            <NavLink to="/contacts" style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.linkActive : {}) })}>
              <Users size={18} /> Contatos
            </NavLink>
            <NavLink to="/campaigns" style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.linkActive : {}) })}>
              <Megaphone size={18} /> Campanhas
            </NavLink>
            <NavLink to="/knowledge" style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.linkActive : {}) })}>
              <HelpCircle size={18} /> IA Training
            </NavLink>
            {role === 'admin' && (
              <NavLink to="/settings" style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.linkActive : {}) })}>
                <Settings size={18} /> Ajustes
              </NavLink>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={styles.themeBtn}
            title="Alternar Tema"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <button style={{ ...styles.logout, padding: isMobile ? '0.4rem 0.8rem' : '0.5rem 1.25rem' }} onClick={logout}>
            {isMobile ? <LogOut size={18} /> : 'Sair'}
          </button>
        </div>
      </nav>

      <div style={{ ...styles.content, paddingBottom: isMobile ? '70px' : '0' }}>
        <Outlet />
      </div>

      {isMobile && (
        <div style={styles.bottomNav}>
          {mobileLinks.map(link => (
            <NavLink key={link.to} to={link.to} style={({ isActive }) => ({ ...styles.bottomLink, color: isActive ? '#D4AF37' : '#717171' })}>
              <span style={{ fontSize: '1.2rem' }}>{link.icon}</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>{link.label}</span>
            </NavLink>
          ))}
        </div>
      )}

      {notification && (
        <div style={{ ...styles.toast, right: isMobile ? '1rem' : '2rem', left: isMobile ? '1rem' : 'auto' }} onClick={() => { navigate('/inbox'); setNotification(null); }}>
          <div style={styles.toastIcon}><MessageSquare size={24} color="var(--accent)" /></div>
          <div style={styles.toastBody}>
            <div style={styles.toastName}>{notification.name}</div>
            <div style={styles.toastMsg}>{notification.body.slice(0, 50)}...</div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  root: { display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-base)' },
  nav: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '1.5rem', 
    padding: '0 2rem', 
    height: '64px', 
    background: 'var(--bg-panel)', 
    borderBottom: '1px solid var(--border-color)',
    color: 'var(--text-main)', 
    flexShrink: 0 
  },
  brandGroup: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginRight: 'auto' },
  brandIcon: { fontSize: '1.2rem' },
  brand: { fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em', color: 'var(--text-main)' },
  links: { display: 'flex', gap: '0.5rem' },
  link: { 
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'var(--text-muted)', 
    textDecoration: 'none', 
    padding: '0.5rem 1rem', 
    borderRadius: '8px', 
    fontSize: '0.9rem',
    fontWeight: 500,
    transition: 'all 0.2s ease'
  },
  linkActive: { 
    background: 'var(--accent-light)', 
    color: 'var(--accent)', 
    fontWeight: 700,
    boxShadow: 'inset 0 0 0 1px var(--accent-border)'
  },
  themeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    borderRadius: '50%',
    transition: 'all 0.2s',
  },
  logout: { 
    background: 'transparent', 
    border: '1px solid var(--border-color)', 
    color: 'var(--text-muted)', 
    padding: '0.5rem 1.25rem', 
    borderRadius: '8px', 
    cursor: 'pointer', 
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
  },
  content: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  bottomNav: { 
    position: 'fixed', bottom: 0, left: 0, right: 0, height: '70px', 
    background: 'var(--bg-panel)', borderTop: '1px solid var(--border-color)', 
    display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 1000 
  },
  bottomLink: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none' },
  toast: { 
    position: 'fixed', top: '80px', background: 'var(--bg-panel)', border: '1px solid var(--accent)', 
    padding: '1rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem', 
    boxShadow: 'var(--shadow-lg)', zIndex: 9999, cursor: 'pointer',
    animation: 'slideIn 0.3s ease-out'
  },
  toastIcon: { display: 'flex', alignItems: 'center' },
  toastName: { fontWeight: 800, color: 'var(--accent)', fontSize: '0.9rem' },
  toastMsg: { color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' },
};
