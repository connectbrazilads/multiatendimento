import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Printer, 
  Settings, 
  Truck, 
  ShieldCheck, 
  Clock, 
  MessageSquare, 
  ChevronRight, 
  CheckCircle2, 
  Menu, 
  X,
  ArrowUpRight,
  Headphones,
  Zap,
  BarChart3
} from 'lucide-react';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'glass py-4 shadow-2xl' : 'py-6'}`} style={{ padding: '0 5%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* LOGO LCD DIGITAL VETORIZADO */}
          <svg width="140" height="40" viewBox="0 0 140 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 5H2V35H20V30H7V5H10Z" fill="#E31E24"/>
            <path d="M25 5H38C42 5 45 8 45 12V28C45 32 42 35 38 35H25V5ZM30 10V30H38C39 30 40 29 40 28V12C40 11 39 10 38 10H30Z" fill="#E31E24"/>
            <path d="M50 5H65V10H55V17H63V22H55V30H65V35H50V5Z" fill="white"/>
            <text x="50" y="30" fill="white" fontSize="12" fontWeight="800" fontFamily="Inter">Digital</text>
            <text x="2" y="38" fill="#555" fontSize="4" fontWeight="600" fontFamily="Inter" letterSpacing="1">OUTSOURCING DE IMPRESSÃO</text>
          </svg>
        </div>

        <div className="hidden-mobile" style={{ display: 'flex', gap: '2rem', fontWeight: 500, fontSize: '0.85rem', color: isScrolled ? '#fff' : '#a0a0a5' }}>
          <a href="#servicos" style={{ ':hover': { color: '#fff' } }}>Serviços</a>
          <a href="#diferenciais" style={{ ':hover': { color: '#fff' } }}>Diferenciais</a>
          <a href="#sobre" style={{ ':hover': { color: '#fff' } }}>Quem Somos</a>
          <a href="https://crm.lcddigital.com.br/lcddigital/login" target="_blank" style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>Área do Cliente</a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a href="https://wa.me/555181156612" target="_blank" className="primary-button hidden-mobile" style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem' }}>
            Solicitar Orçamento
          </a>
          <button className="mobile-only" onClick={() => setMobileMenuOpen(true)} style={{ background: 'transparent', color: 'white' }}>
            <Menu size={24} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="glass"
            style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '80%', zIndex: 100, padding: '2rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
              <X onClick={() => setMobileMenuOpen(false)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontSize: '1.2rem' }}>
              <a href="#servicos" onClick={() => setMobileMenuOpen(false)}>Serviços</a>
              <a href="#diferenciais" onClick={() => setMobileMenuOpen(false)}>Diferenciais</a>
              <a href="#sobre" onClick={() => setMobileMenuOpen(false)}>Quem Somos</a>
              <button className="primary-button" style={{ marginTop: '1rem' }}>Falar com Consultor</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = () => {
  return (
    <section style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', paddingTop: '100px', paddingLeft: '5%', paddingRight: '5%' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem', alignItems: 'center' }}>
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(227, 30, 36, 0.1)', borderRadius: '100px', border: '1px solid rgba(227, 30, 36, 0.2)', marginBottom: '1.5rem' }}>
            <Zap size={14} color="var(--primary)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.05em' }}>LÍDER EM OUTSOURCING NO SUL</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.1, marginBottom: '1.5rem' }}>
            Inteligência e Economia em <br />
            <span style={{ color: 'var(--primary)' }}>Impressão Corporativa</span>
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '2.5rem', maxWidth: '600px' }}>
            Reduza custos em até 40% com gestão automatizada de suprimentos e suporte técnico especializado. Sua infraestrutura focada em alta performance.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a href="https://wa.me/555181156612" target="_blank" className="primary-button" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              Solicitar Orçamento <ChevronRight size={18} />
            </a>
            <a href="#servicos" className="secondary-button" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              Ver Soluções <ArrowUpRight size={18} />
            </a>
          </div>

          <div style={{ marginTop: '3rem', display: 'flex', gap: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}>
            <div>
              <h4 style={{ fontSize: '1.5rem', color: 'white' }}>+20 Anos</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>de experiência</p>
            </div>
            <div>
              <h4 style={{ fontSize: '1.5rem', color: 'white' }}>99%</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Satisfação (CSAT)</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          style={{ position: 'relative' }}
        >
          <div style={{ 
            position: 'absolute', width: '100%', height: '100%', 
            background: 'radial-gradient(circle, rgba(227,30,36,0.1) 0%, transparent 70%)',
            filter: 'blur(50px)', zIndex: -1
          }}></div>
          <img 
            src="https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?q=80&w=2070&auto=format&fit=crop" 
            alt="Office Printer" 
            style={{ width: '100%', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)' }} 
          />
          <div className="glass" style={{ position: 'absolute', bottom: '-30px', left: '-30px', padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ background: '#00C853', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 color="white" />
            </div>
            <div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Suporte Ativo</p>
              <p style={{ fontSize: '0.9rem', fontWeight: 800 }}>Reposição em 4h</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const Partners = () => {
  const partners = ["RICOH", "LEXMARK", "XEROX", "BROTHER", "SAMSUNG", "CANON"];
  return (
    <div style={{ padding: '4rem 0', borderY: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.01)' }}>
      <p style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#555', letterSpacing: '0.3em', marginBottom: '2rem' }}>MARCAS QUE CONFIAM EM NÓS</p>
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '3rem', padding: '0 5%' }}>
        {partners.map(p => (
          <span key={p} style={{ fontSize: '1.5rem', fontWeight: 900, color: '#222', filter: 'grayscale(1)' }}>{p}</span>
        ))}
      </div>
    </div>
  );
};

const Services = () => {
  const items = [
    { 
      icon: <Printer size={32} color="var(--primary)" />, 
      title: "Locação (Outsourcing)", 
      desc: "Parque tecnológico sempre atualizado sem imobilização de capital. Máquinas novas com manutenção inclusa.",
      tag: "Mais Vendido"
    },
    { 
      icon: <Zap size={32} color="var(--primary)" />, 
      title: "Gestão de Insumos", 
      desc: "Monitoramento remoto inteligente. O toner chega antes de acabar, garantindo que sua empresa nunca pare.",
      tag: "Inteligente"
    },
    { 
      icon: <Headphones size={32} color="var(--primary)" />, 
      title: "Suporte Especializado", 
      desc: "Time técnico certificado com SLA agressivo. Assistência remota e presencial em tempo recorde.",
      tag: "Prioritário"
    },
    { 
      icon: <BarChart3 size={32} color="var(--primary)" />, 
      title: "Software de Gestão", 
      desc: "Controle total de quem imprime, o que e quanto custa. Relatórios detalhados para tomada de decisão.",
      tag: "Controle"
    }
  ];

  return (
    <section id="servicos" style={{ padding: '100px 5%' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Nossas <span style={{ color: 'var(--primary)' }}>Soluções</span></h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>Tudo o que sua empresa precisa para gerenciar documentos com eficiência e baixo custo.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
          {items.map((item, idx) => (
            <motion.div
              key={idx}
              whileHover={{ translateY: -10 }}
              className="glass"
              style={{ padding: '2.5rem', borderRadius: '24px', transition: '0.3s' }}
            >
              <div style={{ marginBottom: '1.5rem' }}>{item.icon}</div>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', background: 'rgba(227,30,36,0.1)', padding: '4px 8px', borderRadius: '4px' }}>{item.tag}</span>
              <h3 style={{ fontSize: '1.4rem', marginTop: '1rem', marginBottom: '1rem' }}>{item.title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>{item.desc}</p>
              <button style={{ background: 'transparent', color: 'white', marginTop: '1.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                Saiba mais <ArrowUpRight size={14} />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FeatureHighlight = () => {
  return (
    <section id="diferenciais" style={{ padding: '100px 5%', background: '#0D0D0E' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '5rem', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Por que a <br /> <span style={{ color: 'var(--primary)' }}>LCD Digital</span> é diferente?</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div style={{ flexShrink: 0, width: '48px', height: '48px', background: 'rgba(227,30,36,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={24} color="var(--primary)" />
              </div>
              <div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Atendimento Ultra-Rápido</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Suporte técnico via IA e humano com resposta imediata. Seu negócio não pode esperar.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div style={{ flexShrink: 0, width: '48px', height: '48px', background: 'rgba(227,30,36,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={24} color="var(--primary)" />
              </div>
              <div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Hardware de Elite</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Trabalhamos apenas com as melhores marcas mundiais: Ricoh, Canon e Lexmark.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div style={{ flexShrink: 0, width: '48px', height: '48px', background: 'rgba(227,30,36,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Settings size={24} color="var(--primary)" />
              </div>
              <div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Contratos Flexíveis</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Modelos de contrato que se ajustam ao tamanho da sua demanda, de pequenas a grandes empresas.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass" style={{ padding: '3rem', borderRadius: '32px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '40px', background: 'var(--primary)', color: 'white', padding: '10px 20px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 800 }}>
            SIMULADOR DE ECONOMIA
          </div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>O que sua empresa ganha?</h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><CheckCircle2 color="var(--primary)" size={20} /> Zero custo com manutenção e peças</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><CheckCircle2 color="var(--primary)" size={20} /> Abatimento de até 100% no IR (Lucro Real)</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><CheckCircle2 color="var(--primary)" size={20} /> Equipamentos reserva garantidos</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><CheckCircle2 color="var(--primary)" size={20} /> Controle total de impressões por usuário</li>
          </ul>
          <button className="primary-button" style={{ width: '100%', marginTop: '2rem' }}>Fazer um Diagnóstico Grátis</button>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer style={{ background: '#070708', padding: '80px 5% 40px', borderTop: '1px solid var(--glass-border)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '4rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
            <div style={{ background: 'var(--primary)', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Printer size={16} color="white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>LCD <span style={{ color: 'var(--primary)' }}>Digital</span></span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '250px' }}>
            Transformando o caos documental em eficiência digital. Sua parceira estratégica em outsourcing.
          </p>
        </div>

        <div>
          <h5 style={{ marginBottom: '1.5rem', color: 'white' }}>Soluções</h5>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <li>Locação de Impressoras</li>
            <li>Venda de Insumos</li>
            <li>Assistência Técnica</li>
            <li>Softwares de Bilhetagem</li>
          </ul>
        </div>

        <div>
          <h5 style={{ marginBottom: '1.5rem', color: 'white' }}>Empresa</h5>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <li>Sobre nós</li>
            <li>Política de Privacidade</li>
            <li>Trabalhe Conosco</li>
            <li>LGPD</li>
          </ul>
        </div>

        <div>
          <h5 style={{ marginBottom: '1.5rem', color: 'white' }}>Contato</h5>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>atendimento@lcddigital.com.br</p>
          <p style={{ color: 'white', fontWeight: 700, marginBottom: '0.2rem' }}>Fixo: (51) 3028-4222</p>
          <p style={{ color: 'white', fontWeight: 700 }}>Whats: (51) 8115-6612</p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <a href="https://wa.me/555181156612" target="_blank" style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1A1A1B', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #333' }}>
              <MessageSquare size={18} />
            </a>
          </div>
        </div>

        <div>
          <h5 style={{ marginBottom: '1.5rem', color: 'white' }}>Localização</h5>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>
            Rua Vinte e Quatro de Agosto, 103<br />
            Jardim Itu, Porto Alegre - RS<br />
            CEP: 91215-280
          </p>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: '5rem', paddingTop: '2rem', borderTop: '1px solid #1A1A1B', color: '#444', fontSize: '0.75rem' }}>
        © 2026 LCD DIGITAL - OUTSOURCING DE IMPRESSÃO. TODOS OS DIREITOS RESERVADOS.
      </div>
    </footer>
  );
};

const WhatsAppWidget = () => {
  return (
    <motion.div 
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 2 }}
      style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 1000 }}
    >
      <a 
        href="https://wa.me/555181156612?text=Ol%C3%A1%2C%20gostaria%20de%20um%20or%C3%A7amento!" 
        target="_blank"
        rel="noopener noreferrer"
        style={{ 
          background: '#25D366', width: '64px', height: '64px', borderRadius: '50%', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          boxShadow: '0 10px 30px rgba(37, 211, 102, 0.4)',
          position: 'relative'
        }}
      >
        <MessageSquare color="white" size={30} />
        <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'white', color: '#25D366', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900 }}>1</span>
      </a>
    </motion.div>
  );
};

function App() {
  return (
    <div className="premium-gradient" style={{ minHeight: '100vh' }}>
      <Navbar />
      <Hero />
      <Partners />
      <Services />
      <FeatureHighlight />
      <Footer />
      <WhatsAppWidget />

      {/* Estilos responsivos rápidos inline */}
      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .mobile-only { display: block !important; }
        }
        @media (min-width: 769px) {
          .mobile-only { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default App;
