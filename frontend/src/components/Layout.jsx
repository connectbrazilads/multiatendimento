import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { SOCKET_URL } from '../services/socket';

export default function Layout() {
  const navigate = useNavigate();

  const [notification, setNotification] = useState(null);
  const audioRef = React.useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'));

  function logout() {
    localStorage.clear();
    navigate('/login');
  }

  const role = localStorage.getItem('role');

  React.useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const tenantId = localStorage.getItem('tenantId');
    if (tenantId) {
      const token = localStorage.getItem('token');
      const s = io(SOCKET_URL, { 
        auth: { token },
        transports: ['websocket'],
        upgrade: false
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
    { to: '/dashboard', icon: '📊', label: 'Dash' },
    { to: '/inbox', icon: '💬', label: 'Chat' },
    { to: '/contacts', icon: '📔', label: 'Contatos' },
    { to: '/settings', icon: '⚙️', label: 'Ajustes' },
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
              📊 Dashboard
            </NavLink>
            <NavLink to="/inbox" style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.linkActive : {}) })}>
              💬 Chat
            </NavLink>
            <NavLink to="/connections" style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.linkActive : {}) })}>
              🔌 Conexões
            </NavLink>
            <NavLink to="/contacts" style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.linkActive : {}) })}>
              📔 Contatos
            </NavLink>
            <NavLink to="/campaigns" style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.linkActive : {}) })}>
              📢 Campanhas
            </NavLink>
            <NavLink to="/knowledge" style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.linkActive : {}) })}>
              🧠 IA Training
            </NavLink>
            {role === 'admin' && (
              <NavLink to="/settings" style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.linkActive : {}) })}>
                ⚙️ Ajustes
              </NavLink>
            )}
          </div>
        )}

        <button style={{ ...styles.logout, padding: isMobile ? '0.4rem 0.8rem' : '0.5rem 1.25rem' }} onClick={logout}>Sair</button>
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
          <div style={styles.toastIcon}>💬</div>
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
  root: { display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: "'Inter', sans-serif", background: '#0F0F0F' },
  nav: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '1.5rem', 
    padding: '0 2rem', 
    height: '64px', 
    background: '#1A1A1B', 
    borderBottom: '1px solid #333',
    color: '#fff', 
    flexShrink: 0 
  },
  brandGroup: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginRight: 'auto' },
  brandIcon: { fontSize: '1.2rem' },
  brand: { fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em', color: '#fff' },
  links: { display: 'flex', gap: '0.5rem' },
  link: { 
    color: '#A0A0A0', 
    textDecoration: 'none', 
    padding: '0.5rem 1rem', 
    borderRadius: '8px', 
    fontSize: '0.9rem',
    fontWeight: 500,
    transition: 'all 0.2s ease'
  },
  linkActive: { 
    background: 'rgba(212, 175, 55, 0.1)', 
    color: '#D4AF37', 
    fontWeight: 700,
    boxShadow: 'inset 0 0 0 1px rgba(212, 175, 55, 0.2)'
  },
  logout: { 
    background: 'transparent', 
    border: '1px solid #333', 
    color: '#A0A0A0', 
    padding: '0.5rem 1.25rem', 
    borderRadius: '8px', 
    cursor: 'pointer', 
    fontSize: '0.85rem',
    transition: 'all 0.2s',
    ':hover': { borderColor: '#D4AF37', color: '#D4AF37' }
  },
  content: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  bottomNav: { 
    position: 'fixed', bottom: 0, left: 0, right: 0, height: '70px', 
    background: '#1A1A1B', borderTop: '1px solid #333', 
    display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 1000 
  },
  bottomLink: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none' },
  toast: { 
    position: 'fixed', top: '80px', background: '#1A1A1B', border: '1px solid #D4AF37', 
    padding: '1rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem', 
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 9999, cursor: 'pointer',
    animation: 'slideIn 0.3s ease-out'
  },
  toastIcon: { fontSize: '1.5rem' },
  toastName: { fontWeight: 800, color: '#D4AF37', fontSize: '0.9rem' },
  toastMsg: { color: '#A0A0A0', fontSize: '0.8rem', marginTop: '2px' },
};
