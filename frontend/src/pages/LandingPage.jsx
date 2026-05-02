import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={s.container}>
      {/* Navbar */}
      <nav style={s.nav}>
        <div style={s.logo}>
          ✨ Multiatendimento <span style={s.gold}>PRO</span>
        </div>
        <div style={s.navLinks}>
          <button style={s.loginBtn} onClick={() => navigate('/login')}>Acessar Sistema</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={s.hero}>
        <div style={s.glow} />
        <h1 style={s.heroTitle}>
          Sua comunicação no <br />
          <span style={s.heroGradient}>Nível de Elite</span>
        </h1>
        <p style={s.heroSubtitle}>
          O multiatendimento omnichannel mais sofisticado do mercado. 
          Gerencie múltiplos números de WhatsApp, use IA para resumir conversas 
          e transcreva áudios instantaneamente.
        </p>
        <div style={s.ctaGroup}>
          <button style={s.primaryBtn} onClick={() => navigate('/login')}>Começar Experiência</button>
          <button style={s.secondaryBtn}>Ver Demonstração</button>
        </div>
      </section>

      {/* Features Grid */}
      <section style={s.features}>
        <div style={s.featureCard}>
          <div style={s.featureIcon}>🤖</div>
          <h3>Inteligência Artificial</h3>
          <p>Resumos automáticos das conversas e transcrição de áudios para otimizar o tempo da sua equipe.</p>
        </div>
        <div style={s.featureCard}>
          <div style={s.featureIcon}>🔌</div>
          <h3>Multi-Instâncias</h3>
          <p>Conecte quantos números de WhatsApp precisar e gerencie tudo em uma única caixa de entrada.</p>
        </div>
        <div style={s.featureCard}>
          <div style={s.featureIcon}>🛡️</div>
          <h3>Segurança & Auditoria</h3>
          <p>Mensagens apagadas continuam visíveis para o administrador, garantindo total controle operacional.</p>
        </div>
      </section>

      {/* Stats Section */}
      <section style={s.stats}>
        <div style={s.statItem}>
          <div style={s.statNum}>+99%</div>
          <div style={s.statLabel}>Taxa de Resposta</div>
        </div>
        <div style={s.statItem}>
          <div style={s.statNum}>24/7</div>
          <div style={s.statLabel}>Atendimento Ativo</div>
        </div>
        <div style={s.statItem}>
          <div style={s.statNum}>100%</div>
          <div style={s.statLabel}>Cloud Based</div>
        </div>
      </section>

      <footer style={s.footer}>
        &copy; {new Date().getFullYear()} Multiatendimento PRO. O padrão ouro do atendimento digital.
      </footer>
    </div>
  );
}

const s = {
  container: { background: '#050505', color: '#fff', minHeight: '100vh', fontFamily: "'Inter', sans-serif" },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 4rem', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100 },
  logo: { fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.02em' },
  gold: { color: '#D4AF37' },
  loginBtn: { background: 'transparent', border: '1px solid #333', color: '#fff', padding: '0.6rem 1.5rem', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' },
  
  hero: { padding: '8rem 2rem', textAlign: 'center', position: 'relative', overflow: 'hidden' },
  glow: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '800px', height: '800px', background: 'radial-gradient(circle, rgba(212,175,55,0.05) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none' },
  heroTitle: { fontSize: '4.5rem', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: '2rem' },
  heroGradient: { background: 'linear-gradient(to right, #D4AF37, #FFF, #D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  heroSubtitle: { fontSize: '1.2rem', color: '#888', maxWidth: '700px', margin: '0 auto 3rem', lineHeight: 1.6 },
  ctaGroup: { display: 'flex', gap: '1.5rem', justifyContent: 'center' },
  primaryBtn: { background: '#D4AF37', color: '#000', border: 'none', padding: '1rem 2.5rem', borderRadius: '14px', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 30px rgba(212,175,55,0.2)' },
  secondaryBtn: { background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid #222', padding: '1rem 2.5rem', borderRadius: '14px', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer' },

  features: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', padding: '6rem 4rem', background: '#0A0A0A' },
  featureCard: { padding: '3rem', background: '#0F0F0F', borderRadius: '32px', border: '1px solid #1A1A1B', transition: 'transform 0.3s' },
  featureIcon: { fontSize: '3rem', marginBottom: '1.5rem' },

  stats: { display: 'flex', justifyContent: 'space-around', padding: '6rem 4rem', borderTop: '1px solid #111' },
  statItem: { textAlign: 'center' },
  statNum: { fontSize: '3.5rem', fontWeight: 900, color: '#D4AF37', marginBottom: '0.5rem' },
  statLabel: { fontSize: '1rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' },

  footer: { padding: '4rem', textAlign: 'center', color: '#444', fontSize: '0.9rem', borderTop: '1px solid #111' }
};
