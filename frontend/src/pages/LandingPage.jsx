import { useNavigate } from 'react-router-dom';
import { Bot, Link, ShieldCheck, Users, Zap, LayoutDashboard } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={s.container}>
      {/* Navbar */}
      <nav style={s.nav}>
        <div style={s.logo}>
          ✨ Multiatendimento <span style={s.gold}>PRO</span>
        </div>
        <div className="glass-panel" style={s.navLinks}>
          <button style={s.loginBtn} onClick={() => navigate('/login')}>Acessar Sistema</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={s.hero}>
        <div style={s.glow} />
        <h1 style={s.heroTitle}>
          Atenda WhatsApp com <br />
          <span style={s.heroGradient}>Múltiplos Agentes</span>
        </h1>
        <p style={s.heroSubtitle}>
          A plataforma SaaS definitiva para centralizar o atendimento da sua empresa. 
          Distribua conversas por equipes, controle seus contatos e use a IA para otimizar 
          respostas e resumos.
        </p>
        <div style={s.ctaGroup}>
          <button style={s.primaryBtn} onClick={() => navigate('/login')}>Começar Gratuitamente</button>
          <button style={s.secondaryBtn}>Ver Funcionalidades</button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="landing-features" style={s.features}>
        <div className="glass-panel" style={s.featureCard}>
          <div style={s.featureIcon}><Bot size={40} color="var(--accent)" /></div>
          <h3 style={s.featureTitle}>Automação com IA</h3>
          <p style={s.featureText}>Resumos automáticos das conversas e transcrição de áudios para otimizar o tempo da sua equipe de vendas e suporte.</p>
        </div>
        <div className="glass-panel" style={s.featureCard}>
          <div style={s.featureIcon}><Users size={40} color="var(--accent)" /></div>
          <h3 style={s.featureTitle}>Trabalho em Equipe</h3>
          <p style={s.featureText}>Vários atendentes usando o mesmo número de WhatsApp simultaneamente, com filas de atendimento organizadas.</p>
        </div>
        <div className="glass-panel" style={s.featureCard}>
          <div style={s.featureIcon}><ShieldCheck size={40} color="var(--accent)" /></div>
          <h3 style={s.featureTitle}>Segurança e Auditoria</h3>
          <p style={s.featureText}>Histórico completo de conversas. Mensagens apagadas continuam visíveis para os administradores da conta.</p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="landing-stats" style={s.stats}>
        <div style={s.statItem}>
          <div style={s.statNum}>+300%</div>
          <div style={s.statLabel}>Produtividade</div>
        </div>
        <div style={s.statItem}>
          <div style={s.statNum}>24/7</div>
          <div style={s.statLabel}>Atendimento Online</div>
        </div>
        <div style={s.statItem}>
          <div style={s.statNum}>100%</div>
          <div style={s.statLabel}>Cloud SaaS</div>
        </div>
      </section>

      <footer style={s.footer}>
        &copy; {new Date().getFullYear()} Multiatendimento PRO. O CRM definitivo para escalar sua operação no WhatsApp.
      </footer>
    </div>
  );
}

const s = {
  container: { background: 'var(--bg-base)', color: 'var(--text-main)', minHeight: '100vh', fontFamily: "var(--font-main)" },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 4rem', background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--border-light)' },
  logo: { fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-main)' },
  gold: { color: 'var(--accent)' },
  loginBtn: { background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '0.6rem 1.5rem', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' },
  
  hero: { padding: '8rem 2rem', textAlign: 'center', position: 'relative', overflow: 'hidden' },
  glow: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '800px', height: '800px', background: 'radial-gradient(circle, var(--accent-light) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none' },
  heroTitle: { fontSize: '4.5rem', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: '2rem', color: 'var(--text-main)' },
  heroGradient: { background: 'linear-gradient(to right, var(--accent), var(--text-main), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  heroSubtitle: { fontSize: '1.2rem', color: 'var(--text-muted)', maxWidth: '700px', margin: '0 auto 3rem', lineHeight: 1.6 },
  ctaGroup: { display: 'flex', gap: '1.5rem', justifyContent: 'center' },
  primaryBtn: { background: 'var(--accent)', color: '#000', border: 'none', padding: '1rem 2.5rem', borderRadius: 'var(--radius-lg)', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer', boxShadow: 'var(--shadow-sm)' },
  secondaryBtn: { background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '1rem 2.5rem', borderRadius: 'var(--radius-lg)', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer' },

  features: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', padding: '6rem 4rem', background: 'var(--bg-panel)' },
  featureCard: { padding: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  featureIcon: { marginBottom: '0.5rem' },
  featureTitle: { fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' },
  featureText: { fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 },

  stats: { display: 'flex', justifyContent: 'space-around', padding: '6rem 4rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-base)' },
  statItem: { textAlign: 'center' },
  statNum: { fontSize: '3.5rem', fontWeight: 900, color: 'var(--accent)', marginBottom: '0.5rem' },
  statLabel: { fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 },

  footer: { padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-base)' }
};
