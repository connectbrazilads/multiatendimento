import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { login, getTenantBySlug, getMediaUrl } from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenantInfo, setTenantInfo] = useState(null);
  const navigate = useNavigate();
  const { slug } = useParams();

  useEffect(() => {
    if (slug) {
      loadTenant();
    }
  }, [slug]);

  async function loadTenant() {
    try {
      const { data } = await getTenantBySlug(slug);
      setTenantInfo(data);
    } catch (e) {
      console.error('Tenant not found');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await login(email, password, slug);
      localStorage.setItem('token', data.token);
      localStorage.setItem('tenantId', data.tenant?.id || '');
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('role', data.user.role);
      navigate('/dashboard');
    } catch (err) {
      setError('E-mail ou senha inválidos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const primaryColor = tenantInfo?.primaryColor || '#D4AF37';

  return (
    <div style={s.container}>
      <style>{`
        @keyframes card-in {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div style={{ ...s.glow, background: `radial-gradient(circle, ${primaryColor}22 0%, rgba(0,0,0,0) 70%)` }} />
      <div style={{ ...s.card, animation: 'card-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <div style={s.header}>
          {tenantInfo?.logoUrl ? (
            <img src={getMediaUrl(tenantInfo.logoUrl)} alt={tenantInfo.name} style={{ height: '60px', marginBottom: '1.5rem', objectFit: 'contain' }} />
          ) : (
            <div style={{ ...s.logoIcon, filter: `drop-shadow(0 0 10px ${primaryColor}44)` }}>✨</div>
          )}
          <h1 style={s.title}>
            {tenantInfo ? tenantInfo.name : 'Multiatendimento'} <span style={{ ...s.pro, color: primaryColor }}>PRO</span>
          </h1>
          <p style={s.subtitle}>
            {tenantInfo ? `Portal de acesso para ${tenantInfo.name}` : 'Acesse seu ecossistema de atendimento premium'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.inputGroup}>
            <label style={s.label}>E-mail corporativo</label>
            <input 
              style={s.input} 
              type="email" 
              placeholder="seu@email.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              onFocus={e => e.target.style.borderColor = primaryColor}
              onBlur={e => e.target.style.borderColor = '#2A2A2A'}
              autoFocus
              required 
            />
          </div>

          <div style={s.inputGroup}>
            <label style={s.label}>Chave de acesso</label>
            <input 
              style={s.input} 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              onFocus={e => e.target.style.borderColor = primaryColor}
              onBlur={e => e.target.style.borderColor = '#2A2A2A'}
              required 
            />
          </div>

          {error && <div style={s.error}>{error}</div>}

          <button style={{ ...s.button, background: primaryColor }} type="submit" disabled={loading}>
            {loading ? 'Validando Acesso...' : 'Entrar no Sistema'}
          </button>
        </form>

        <footer style={s.footer}>
          &copy; {new Date().getFullYear()} Multiatendimento PRO. Tecnologia de elite.
        </footer>
      </div>
    </div>
  );
}

const s = {
  container: { 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    height: '100vh', 
    background: '#050505', 
    fontFamily: "'Inter', sans-serif",
    position: 'relative',
    overflow: 'hidden'
  },
  glow: {
    position: 'absolute',
    width: '600px',
    height: '600px',
    background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, rgba(0,0,0,0) 70%)',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none'
  },
  card: { 
    background: '#0F0F0F', 
    padding: '3rem', 
    borderRadius: '24px', 
    border: '1px solid #1A1A1B',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)',
    zIndex: 1,
    position: 'relative'
  },
  header: { textAlign: 'center', marginBottom: '2.5rem' },
  logoIcon: { fontSize: '2.5rem', marginBottom: '1rem', filter: 'drop-shadow(0 0 10px rgba(212, 175, 55, 0.3))' },
  title: { fontSize: '1.6rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', margin: 0 },
  pro: { color: '#D4AF37', fontSize: '0.8rem', verticalAlign: 'top', fontWeight: 800 },
  subtitle: { color: '#717171', fontSize: '0.9rem', marginTop: '0.5rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  label: { fontSize: '0.75rem', fontWeight: 800, color: '#717171', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: { 
    padding: '1rem', 
    background: '#131314', 
    border: '1px solid #2A2A2A', 
    borderRadius: '12px', 
    fontSize: '1rem', 
    color: '#fff',
    outline: 'none',
    transition: 'border-color 0.2s',
    width: '100%',
    boxSizing: 'border-box',
  },
  button: { 
    padding: '1rem', 
    background: '#D4AF37', 
    color: '#000', 
    border: 'none', 
    borderRadius: '12px', 
    fontSize: '1rem', 
    fontWeight: 800, 
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: '1rem'
  },
  error: { color: '#ff4444', fontSize: '0.85rem', textAlign: 'center', background: 'rgba(255, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255, 68, 68, 0.2)' },
  footer: { textAlign: 'center', marginTop: '3rem', fontSize: '0.75rem', color: '#444' }
};
