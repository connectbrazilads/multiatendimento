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

// Importando imagens reais da pasta assets
import LogoImg from './assets/logo lcd.png';
import HeroImg from './assets/c70.png';
import SuprimentosImg from './assets/suprimentos.png';
import ScannerImg from './assets/SCANNER.png';
import LexmarkImg from './assets/LEXMARK.png';
import PantumImg from './assets/PANTUM.png';
import CanonImg from './assets/canon.png';
import LogosBannerImg from './assets/logos.png';
import Xerox8100Img from './assets/xerox c8100.jpeg';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'glass py-3 shadow-lg' : 'py-5'}`} style={{ padding: '0 5%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={LogoImg} alt="LCD Digital" style={{ height: isScrolled ? '45px' : '55px', transition: '0.3s' }} />
        </div>

        <div className="hidden-mobile" style={{ display: 'flex', gap: '2.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#333' }}>
          <a href="#servicos" style={{ color: 'inherit' }}>Serviços</a>
          <a href="#diferenciais" style={{ color: 'inherit' }}>Diferenciais</a>
          <a href="#sobre" style={{ color: 'inherit' }}>Quem Somos</a>
          <a href="https://crm.lcddigital.com.br/lcddigital/login" target="_blank" style={{ color: 'var(--primary)', fontWeight: 800 }}>Área do Cliente</a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a href="https://wa.me/555194412679" target="_blank" className="primary-button hidden-mobile" style={{ padding: '0.7rem 1.8rem', fontSize: '0.85rem' }}>
            Solicitar Orçamento
          </a>
          <button className="mobile-only" onClick={() => setMobileMenuOpen(true)} style={{ background: 'transparent', color: '#000' }}>
            <Menu size={28} />
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
            style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '85%', zIndex: 100, padding: '2rem', background: 'white' }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
              <X onClick={() => setMobileMenuOpen(false)} size={32} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', fontSize: '1.3rem', fontWeight: 700 }}>
              <a href="#servicos" onClick={() => setMobileMenuOpen(false)}>Serviços</a>
              <a href="#diferenciais" onClick={() => setMobileMenuOpen(false)}>Diferenciais</a>
              <a href="#sobre" onClick={() => setMobileMenuOpen(false)}>Quem Somos</a>
              <a href="https://crm.lcddigital.com.br/lcddigital/login" target="_blank" style={{ color: 'var(--primary)' }}>Área do Cliente</a>
              <a href="https://wa.me/555194412679" target="_blank" className="primary-button" style={{ textAlign: 'center', marginTop: '1rem' }}>Falar com Consultor</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = () => {
  return (
    <section style={{ minHeight: '95vh', display: 'flex', alignItems: 'center', paddingTop: '120px', paddingLeft: '5%', paddingRight: '5%', background: 'var(--bg-secondary)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '4rem', alignItems: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'rgba(227, 30, 36, 0.08)', borderRadius: '100px', border: '1px solid rgba(227, 30, 36, 0.15)', marginBottom: '1.5rem' }}>
            <Zap size={14} color="var(--primary)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.05em' }}>OUTSOURCING DE ALTA PERFORMANCE</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2.8rem, 6vw, 4.5rem)', lineHeight: 1.05, marginBottom: '1.5rem', color: '#111' }}>
            A Solução Ideal em <br />
            <span style={{ color: 'var(--primary)' }}>Impressão Digital</span>
          </h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '2.5rem', maxWidth: '600px', fontWeight: 400 }}>
            Tecnologia de ponta e gestão inteligente para o seu negócio. Reduza custos e aumente a produtividade com a LCD Digital.
          </p>
          <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}>
            <a href="https://wa.me/555194412679" target="_blank" className="primary-button" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem' }}>
              Solicitar Orçamento <ChevronRight size={20} />
            </a>
            <a href="#servicos" className="secondary-button" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', background: '#fff' }}>
              Ver Equipamentos <ArrowUpRight size={20} />
            </a>
          </div>

          <div style={{ marginTop: '3.5rem', display: 'flex', gap: '3rem', borderTop: '1px solid #E9ECEF', paddingTop: '2rem' }}>
            <div>
              <h4 style={{ fontSize: '1.8rem', color: '#111' }}>+20 Anos</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>de experiência</p>
            </div>
            <div>
              <h4 style={{ fontSize: '1.8rem', color: '#111' }}>40%</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Economia Média</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
          <div style={{ 
            position: 'absolute', width: '80%', height: '80%', 
            background: 'radial-gradient(circle, rgba(227,30,36,0.08) 0%, transparent 70%)',
            filter: 'blur(50px)', zIndex: -1
          }}></div>
          <img 
            src={LogoImg} 
            alt="LCD Digital Logo" 
            style={{ width: '100%', maxWidth: '450px', filter: 'drop-shadow(0 15px 30px rgba(0,0,0,0.08))' }} 
          />
        </motion.div>
      </div>
    </section>
  );
};

const Partners = () => {
  return (
    <div style={{ padding: '4rem 0', background: 'white', borderBottom: '1px solid #F1F3F5' }}>
      <p style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#999', letterSpacing: '0.2em', marginBottom: '2.5rem' }}>PARCEIROS TECNOLÓGICOS</p>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 5%' }}>
        <img src={LogosBannerImg} alt="Parceiros" style={{ maxWidth: '80%', height: 'auto', opacity: 0.9 }} />
      </div>
    </div>
  );
};

const Services = () => {
  const items = [
    { 
      icon: <Printer size={36} color="var(--primary)" />, 
      title: "Locação Profissional", 
      desc: "Equipamentos de última geração com manutenção e suporte inclusos no contrato.",
      img: HeroImg,
      tag: "Solução Completa"
    },
    { 
      icon: <Truck size={36} color="var(--primary)" />, 
      title: "Gestão de Insumos", 
      desc: "Toners e peças originais com logística inteligente para sua empresa nunca parar.",
      img: SuprimentosImg,
      tag: "Logística Ágil"
    },
    { 
      icon: <BarChart3 size={36} color="var(--primary)" />, 
      title: "Digitalização e Scanners", 
      desc: "Transforme documentos físicos em digitais com alta velocidade e organização.",
      img: ScannerImg,
      tag: "Tecnologia"
    }
  ];

  return (
    <section id="servicos" style={{ padding: '120px 5%', background: '#fff' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
          <h2 style={{ fontSize: '2.8rem', marginBottom: '1rem', color: '#111' }}>Nossas <span style={{ color: 'var(--primary)' }}>Soluções</span></h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '700px', margin: '0 auto', fontSize: '1.1rem' }}>A excelência técnica que sua empresa merece, com o suporte que você confia.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem' }}>
          {items.map((item, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -15 }}
              style={{ 
                background: '#F8F9FA', 
                borderRadius: '32px', 
                overflow: 'hidden',
                border: '1px solid #E9ECEF',
                transition: '0.4s'
              }}
            >
              <div style={{ height: '240px', overflow: 'hidden', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                <img src={item.img} alt={item.title} style={{ height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ padding: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                   {item.icon}
                   <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', background: 'rgba(227,30,36,0.08)', padding: '4px 10px', borderRadius: '6px' }}>{item.tag}</span>
                </div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#111' }}>{item.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.6 }}>{item.desc}</p>
                <a href="https://wa.me/555194412679" target="_blank" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '2rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}>
                  Saber mais <ArrowUpRight size={16} />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FeatureHighlight = () => {
  return (
    <section id="diferenciais" style={{ padding: '120px 5%', background: 'var(--bg-secondary)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '6rem', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '3rem', marginBottom: '2.5rem', color: '#111', lineHeight: 1.1 }}>Por que escolher a <br /> <span style={{ color: 'var(--primary)' }}>LCD Digital</span>?</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div style={{ flexShrink: 0, width: '56px', height: '56px', background: 'white', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.05)' }}>
                <Clock size={28} color="var(--primary)" />
              </div>
              <div>
                <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#111' }}>SLA de Atendimento Recorde</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Temos o compromisso de resposta rápida para garantir que seu fluxo de trabalho nunca sofra interrupções.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div style={{ flexShrink: 0, width: '56px', height: '56px', background: 'white', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.05)' }}>
                <ShieldCheck size={28} color="var(--primary)" />
              </div>
              <div>
                <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#111' }}>Peças e Insumos Originais</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Utilizamos apenas componentes originais para garantir a maior vida útil dos equipamentos e qualidade de impressão.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div style={{ flexShrink: 0, width: '56px', height: '56px', background: 'white', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.05)' }}>
                <Headphones size={28} color="var(--primary)" />
              </div>
              <div>
                <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#111' }}>Suporte Técnico Especializado</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Nossa equipe é constantemente treinada pelos fabricantes para resolver qualquer desafio técnico.</p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', padding: '4rem', borderRadius: '40px', boxShadow: '0 30px 60px rgba(0,0,0,0.08)', border: '1px solid #E9ECEF' }}>
          <h3 style={{ fontSize: '1.8rem', marginBottom: '2rem', color: '#111' }}>Solicite um Diagnóstico de Custos</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem' }}>Entenda como podemos reduzir sua conta de impressão em até 40% com um parque otimizado.</p>
          <a href="https://wa.me/555194412679" target="_blank" className="primary-button" style={{ width: '100%', textAlign: 'center', display: 'block', fontSize: '1.1rem' }}>Falar com Especialista</a>
          
          <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ textAlign: 'center', padding: '1.5rem', background: '#F8F9FA', borderRadius: '20px' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>100%</p>
              <p style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600 }}>Insumos Originais</p>
            </div>
            <div style={{ textAlign: 'center', padding: '1.5rem', background: '#F8F9FA', borderRadius: '20px' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>24h</p>
              <p style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600 }}>Suporte Ativo</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer style={{ background: 'white', padding: '100px 5% 50px', borderTop: '1px solid #E9ECEF' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '5rem' }}>
        <div>
          <img src={LogoImg} alt="LCD Digital" style={{ height: '60px', marginBottom: '2rem' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '300px', lineHeight: 1.7 }}>
            Excelência em outsourcing de impressão e soluções digitais para empresas que buscam alta performance.
          </p>
        </div>

        <div>
          <h5 style={{ marginBottom: '2rem', fontSize: '1.1rem', color: '#111' }}>Contato</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.3rem' }}>E-mail</p>
              <p style={{ fontWeight: 700 }}>atendimento@lcddigital.com.br</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Telefones</p>
              <p style={{ fontWeight: 700 }}>Fixo: (51) 3028-4222</p>
              <p style={{ fontWeight: 700 }}>Whats: (51) 9441-2679</p>
            </div>
          </div>
        </div>

        <div>
          <h5 style={{ marginBottom: '2rem', fontSize: '1.1rem', color: '#111' }}>Localização</h5>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.8 }}>
            Rua Vinte e Quatro de Agosto, 103<br />
            Jardim Itu, Porto Alegre - RS<br />
            CEP: 91215-280
          </p>
          <a href="https://maps.google.com" target="_blank" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '1.5rem', color: 'var(--primary)', fontWeight: 700 }}>
            Ver no Mapa <ArrowUpRight size={16} />
          </a>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: '6rem', paddingTop: '2.5rem', borderTop: '1px solid #F1F3F5', color: '#999', fontSize: '0.85rem' }}>
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
      transition={{ delay: 2.5 }}
      style={{ position: 'fixed', bottom: '40px', right: '40px', zIndex: 1000 }}
    >
      <a 
        href="https://wa.me/555194412679?text=Ol%C3%A1%2C%20gostaria%20de%20um%20or%C3%A7amento!" 
        target="_blank"
        rel="noopener noreferrer"
        style={{ 
          background: '#25D366', width: '70px', height: '70px', borderRadius: '50%', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          boxShadow: '0 15px 40px rgba(37, 211, 102, 0.4)',
          position: 'relative'
        }}
      >
        <MessageSquare color="white" size={32} />
        <span style={{ position: 'absolute', top: '0', right: '0', background: 'var(--primary)', color: 'white', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900, border: '2px solid white' }}>1</span>
      </a>
    </motion.div>
  );
};

function App() {
  return (
    <div style={{ background: 'var(--bg-main)', minHeight: '100vh' }}>
      <Navbar />
      <Hero />
      <Partners />
      <Services />
      <FeatureHighlight />
      <Footer />
      <WhatsAppWidget />

      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .mobile-only { display: block !important; }
        }
        @media (min-width: 769px) {
          .mobile-only { display: none !important; }
        }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}

export default App;
