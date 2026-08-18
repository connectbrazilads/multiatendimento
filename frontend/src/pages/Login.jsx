import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { getMediaUrl, getTenantBySlug, login } from '../services/api';

function getMonogram(name) {
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return 'M';
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenantInfo, setTenantInfo] = useState(null);
  const [tenantError, setTenantError] = useState(false);
  const navigate = useNavigate();
  const { slug } = useParams();
  const firstPath = window.location.pathname.split('/').filter(Boolean)[0] || '';
  const routeSlug = slug || (firstPath !== 'login' ? firstPath : '') || '';

  useEffect(() => {
    if (!routeSlug) return;

    let active = true;
    setTenantError(false);
    async function loadTenant() {
      try {
        const { data } = await getTenantBySlug(routeSlug);
        const resolvedTenant = data?.tenant || data || null;
        if (active && resolvedTenant) {
          setTenantInfo({
            ...resolvedTenant,
            name: resolvedTenant.name || routeSlug || 'LCD Digital',
            slug: resolvedTenant.slug || routeSlug,
          });
        }
      } catch {
        console.error('Tenant not found');
        if (active) setTenantError(true);
      }
    }

    loadTenant();
    return () => { active = false; };
  }, [routeSlug]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await login(email, password, routeSlug);
      localStorage.setItem('token', data.token);
      localStorage.setItem('tenantId', data.tenant?.id || '');
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('role', data.user.role);
      navigate(data.user.role === 'superadmin' ? '/superadmin' : '/dashboard');
    } catch (err) {
      if (!err?.response) {
        setError('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
      } else if (err.response.status >= 500) {
        setError('O servidor está indisponível no momento. Tente novamente em instantes.');
      } else {
        setError(err.response.data?.error || 'E-mail ou senha inválidos. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  const primaryColor = tenantInfo?.primaryColor || '#C9A84E';
  const displayName = tenantInfo?.name || (routeSlug ? routeSlug.toUpperCase() : 'Multiatendimento');

  return (
    <main style={{ ...s.container, '--login-accent': primaryColor }}>
      <style>{`
        @keyframes login-card-in {
          from { opacity: 0; transform: translateY(14px) scale(0.99); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .login-input:focus-visible {
          border-color: var(--login-accent) !important;
          outline: 2px solid var(--login-accent) !important;
          outline-offset: 2px;
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--login-accent) 24%, transparent) !important;
        }
        .login-button:hover:not(:disabled) { filter: brightness(1.06); transform: translateY(-1px); }
        .login-button:active:not(:disabled) { transform: translateY(0); }
        .login-toggle-password:hover { color: var(--text-muted) !important; }
        .login-toggle-password:focus-visible {
          outline: 2px solid var(--login-accent) !important;
          outline-offset: 2px;
          color: var(--text-muted) !important;
        }
        @media (max-width: 540px) {
          .login-card { padding: 1.6rem !important; border-radius: 16px !important; }
        }
      `}</style>

      <div style={s.grid} aria-hidden="true" />
      <div style={{ ...s.glow, background: `radial-gradient(circle, ${primaryColor}24 0%, transparent 68%)` }} aria-hidden="true" />

      <section className="login-card" style={s.card} aria-labelledby="login-title">
        <div style={s.header}>
          {tenantInfo?.logoUrl ? (
            <div style={s.logoFrame}>
              <img src={getMediaUrl(tenantInfo.logoUrl)} alt={`Logo ${tenantInfo.name}`} style={s.logoImage} />
            </div>
          ) : (
            <div style={{ ...s.monogram, borderColor: `${primaryColor}66` }} aria-hidden="true">
              <span style={{ ...s.monogramAccent, background: primaryColor }} />
              <span>{getMonogram(displayName)}</span>
            </div>
          )}

          <p style={{ ...s.eyebrow, color: primaryColor }}>Multiatendimento PRO</p>
          <h1 id="login-title" style={s.title}>{displayName}</h1>
          <p style={s.subtitle}>
            {tenantInfo?.name ? `Acesse o ambiente de ${tenantInfo.name}.` : 'Sua operação de atendimento em um só lugar.'}
          </p>
          {tenantError ? (
            <p style={s.tenantNotice} role="alert">
              Não foi possível carregar os dados desta empresa pelo link acessado. Você ainda pode tentar entrar abaixo.
            </p>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.inputGroup}>
            <label htmlFor="login-email" style={s.label}>E-mail corporativo</label>
            <input
              id="login-email"
              className="login-input"
              style={s.input}
              type="email"
              placeholder="nome@empresa.com.br"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          <div style={s.inputGroup}>
            <label htmlFor="login-password" style={s.label}>Senha</label>
            <div style={s.passwordWrapper}>
              <input
                id="login-password"
                className="login-input"
                style={{ ...s.input, paddingRight: 'var(--space-12)' }}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-toggle-password"
                style={s.togglePassword}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error ? <div role="alert" style={s.error}>{error}</div> : null}

          <button
            className="login-button"
            style={{ ...s.button, background: primaryColor }}
            type="submit"
            disabled={loading}
            aria-busy={loading || undefined}
          >
            {loading ? <span className="ui-spinner" aria-hidden="true" /> : null}
            {loading ? 'Validando acesso...' : 'Entrar'}
          </button>
        </form>

        <footer style={s.footer}>
          <span>© {new Date().getFullYear()} Multiatendimento PRO</span>
          <span style={s.footerDot} aria-hidden="true">•</span>
          <span>Ambiente seguro</span>
        </footer>
      </section>
    </main>
  );
}

const s = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100dvh',
    background: '#0B0D12',
    fontFamily: 'var(--font-main)',
    position: 'relative',
    overflow: 'hidden',
    padding: 'clamp(1rem, 4vw, 3rem)',
  },
  grid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)',
    backgroundSize: '48px 48px',
    maskImage: 'linear-gradient(to bottom, rgba(0,0,0,.55), transparent 78%)',
    pointerEvents: 'none',
  },
  glow: {
    position: 'absolute',
    width: 'min(760px, 120vw)',
    aspectRatio: '1',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -54%)',
    pointerEvents: 'none',
  },
  card: {
    width: 'min(100%, 430px)',
    background: 'rgba(17, 21, 29, 0.94)',
    padding: 'clamp(2rem, 5vw, 3rem)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid #293241',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 1,
    position: 'relative',
    backdropFilter: 'blur(18px)',
    animation: 'login-card-in 0.38s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  header: { textAlign: 'center', marginBottom: 'var(--space-8)' },
  logoFrame: { height: '64px', marginBottom: 'var(--space-5)', display: 'flex', justifyContent: 'center' },
  logoImage: { maxWidth: '180px', height: '64px', objectFit: 'contain' },
  monogram: {
    width: '64px',
    height: '64px',
    margin: '0 auto var(--space-5)',
    borderRadius: 'var(--radius-md)',
    background: '#171C26',
    border: '1px solid',
    color: '#F4F6FA',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    fontSize: 'var(--text-lg)',
    fontWeight: 700,
    letterSpacing: '-0.04em',
    boxShadow: 'var(--shadow-sm)',
  },
  monogramAccent: { position: 'absolute', inset: '0 auto 0 0', width: '3px' },
  eyebrow: { margin: '0 0 var(--space-2)', fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase' },
  title: { fontSize: 'var(--text-2xl)', lineHeight: 'var(--leading-tight)', fontWeight: 700, color: '#F4F6FA', letterSpacing: '-0.035em', margin: 0 },
  subtitle: { color: '#AAB4C5', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-relaxed)', margin: 'var(--space-2) auto 0', maxWidth: '22rem' },
  tenantNotice: {
    color: 'var(--warning-text)',
    background: 'var(--warning-light)',
    border: '1px solid var(--warning-border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--text-xs)',
    lineHeight: 'var(--leading-normal)',
    margin: 'var(--space-3) auto 0',
    padding: 'var(--space-2) var(--space-3)',
    maxWidth: '22rem',
  },
  form: { display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' },
  label: { fontSize: 'var(--text-xs)', fontWeight: 600, color: '#AAB4C5' },
  input: {
    minHeight: '48px',
    padding: 'var(--space-3) var(--space-4)',
    background: '#171C26',
    border: '1px solid #293241',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--text-md)',
    color: '#F4F6FA',
    outline: 'none',
    transition: 'border-color 0.16s ease, box-shadow 0.16s ease',
    width: '100%',
  },
  passwordWrapper: { position: 'relative', display: 'flex' },
  togglePassword: {
    position: 'absolute',
    top: '50%',
    right: 'var(--space-2)',
    transform: 'translateY(-50%)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    padding: 0,
    background: 'transparent',
    border: 'none',
    borderRadius: 'var(--radius-xs)',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    transition: 'color 0.16s ease',
  },
  button: {
    minHeight: '50px',
    padding: 'var(--space-3) var(--space-4)',
    color: '#17130A',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--text-sm)',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'transform 0.16s ease, filter 0.16s ease',
    marginTop: 'var(--space-1)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
    boxShadow: '0 10px 26px rgba(201, 168, 78, 0.15)',
  },
  error: { color: 'var(--danger-text)', fontSize: 'var(--text-sm)', background: 'var(--danger-light)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger-border)' },
  footer: { marginTop: 'var(--space-8)', paddingTop: 'var(--space-5)', borderTop: '1px solid #293241', display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 'var(--space-2)', textAlign: 'center', fontSize: 'var(--text-xs)', color: '#7C899E' },
  footerDot: { color: '#C9A84E' },
};
