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
  BarChart3,
  Target,
  Award
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
          <a href="#sobre" style={{ color: 'inherit' }}>Quem Somos</a>
          <a href="#servicos" style={{ color: 'inherit' }}>Serviços</a>
          <a href="#equipamentos" style={{ color: 'inherit' }}>Equipamentos</a>
          <a href="#diferenciais" style={{ color: 'inherit' }}>Diferenciais</a>
          <a href="https://crm.lcddigital.com.br/lcddigital/login" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 800 }}>Área do Cliente</a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a href="https://wa.me/555194412679" target="_blank" rel="noreferrer" className="primary-button hidden-mobile" style={{ padding: '0.7rem 1.8rem', fontSize: '0.85rem' }}>
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
              <a href="#sobre" onClick={() => setMobileMenuOpen(false)}>Quem Somos</a>
              <a href="#servicos" onClick={() => setMobileMenuOpen(false)}>Serviços</a>
              <a href="#equipamentos" onClick={() => setMobileMenuOpen(false)}>Equipamentos</a>
              <a href="#diferenciais" onClick={() => setMobileMenuOpen(false)}>Diferenciais</a>
              <a href="https://crm.lcddigital.com.br/lcddigital/login" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>Área do Cliente</a>
              <a href="https://wa.me/555194412679" target="_blank" rel="noreferrer" className="primary-button" style={{ textAlign: 'center', marginTop: '1rem' }}>Falar com Consultor</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = () => {
  return (
    <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: '100px', paddingLeft: '5%', paddingRight: '5%', background: 'linear-gradient(135deg, #FFF 0%, #F8F9FA 100%)', position: 'relative', overflow: 'hidden' }}>
      {/* Background Glow */}
      <div style={{ position: 'absolute', top: '10%', right: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(227,30,36,0.05) 0%, transparent 60%)', borderRadius: '50%', filter: 'blur(60px)', zIndex: 0 }}></div>
      
      <div className="responsive-grid" style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '4rem', alignItems: 'center', zIndex: 1 }}>
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
            Tecnologia de ponta e gestão inteligente para o seu negócio. Reduza custos operacionais e aumente a produtividade com a LCD Digital.
          </p>
          <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}>
            <a href="https://wa.me/555194412679" target="_blank" rel="noreferrer" className="primary-button" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem' }}>
              Solicitar Orçamento <ChevronRight size={20} />
            </a>
            <a href="#equipamentos" className="secondary-button" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', background: '#fff' }}>
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
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
          <img 
            src={LogoImg} 
            alt="LCD Digital Logo" 
            style={{ width: '100%', maxWidth: '450px', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.1))', animation: 'float 6s ease-in-out infinite' }} 
          />
        </motion.div>
      </div>
    </section>
  );
};

const AboutUs = () => {
  return (
    <section id="sobre" style={{ padding: '120px 5%', background: '#fff', borderTop: '1px solid #F1F3F5' }}>
      <div className="responsive-grid" style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '5rem', alignItems: 'center' }}>
        
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          style={{ position: 'relative' }}
        >
           <div style={{ borderRadius: '32px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.08)' }}>
             <img src={HeroImg} alt="LCD Digital Equipe e Equipamentos" style={{ width: '100%', height: 'auto', display: 'block', transform: 'scale(1.05)' }} />
           </div>
           <div className="glass-card" style={{ position: 'absolute', bottom: '-30px', right: '-30px', padding: '2rem', borderRadius: '24px', maxWidth: '250px' }}>
             <Target size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
             <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Parceria Estratégica</h4>
             <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Comprometidos com o sucesso do seu negócio.</p>
           </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h2 style={{ fontSize: '2.8rem', marginBottom: '1.5rem', color: '#111' }}>Quem <span style={{ color: 'var(--primary)' }}>Somos</span></h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.8 }}>
            Uma empresa especializada em locação, venda de equipamentos e suprimentos, com um portfólio diversificado de serviços. 
            Na LCD DIGITAL, acreditamos que o outsourcing é mais do que um serviço, é uma parceria estratégica para levar sua empresa a novos patamares.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ padding: '10px', background: 'rgba(227,30,36,0.08)', borderRadius: '12px', color: 'var(--primary)' }}><Award size={24} /></div>
              <div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>Equipe Qualificada</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Profissionais altamente capacitados e comprometidos com a excelência, utilizando tecnologia de ponta para garantir eficiência.</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ padding: '10px', background: 'rgba(227,30,36,0.08)', borderRadius: '12px', color: 'var(--primary)' }}><Settings size={24} /></div>
              <div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>Soluções Customizadas</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Avaliamos as necessidades específicas do seu negócio para oferecer o equipamento mais adequado, com ajuste rápido às demandas do mercado.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ padding: '10px', background: 'rgba(227,30,36,0.08)', borderRadius: '12px', color: 'var(--primary)' }}><BarChart3 size={24} /></div>
              <div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>Custo-Benefício</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Redução de custos operacionais e aumento da produtividade, sem a necessidade de grandes investimentos ou intervenção do seu quadro operacional.</p>
              </div>
            </div>
          </div>
          
          <a href="https://wa.me/555194412679" target="_blank" rel="noreferrer" className="primary-button" style={{ display: 'inline-block' }}>Agendar Consulta</a>
        </motion.div>

      </div>
    </section>
  );
};

const Equipment = () => {
  const brands = [
    { name: "Lexmark", img: LexmarkImg },
    { name: "Xerox", img: Xerox8100Img },
    { name: "Canon", img: CanonImg },
    { name: "Pantum", img: PantumImg }
  ];

  return (
    <section id="equipamentos" style={{ padding: '100px 5%', background: 'var(--bg-secondary)', borderTop: '1px solid #E9ECEF' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: '4rem' }}
        >
          <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#111' }}>Equipamentos em <span style={{ color: 'var(--primary)' }}>Destaque</span></h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto', fontSize: '1.1rem' }}>Trabalhamos com as marcas líderes mundiais para garantir a melhor qualidade de impressão e robustez para a sua operação.</p>
        </motion.div>

        <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
          {brands.map((brand, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: idx * 0.1, duration: 0.6 }}
              className="glass-card"
              style={{ borderRadius: '24px', overflow: 'hidden', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fff' }}
            >
              <div style={{ height: '220px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', overflow: 'hidden', borderRadius: '12px', background: '#fff' }}>
                <img 
                  src={brand.img} 
                  alt={brand.name} 
                  style={{ 
                    width: '100%',
                    height: '100%',
                    objectFit: brand.name === 'Xerox' ? 'contain' : 'cover', 
                    objectPosition: brand.name === 'Xerox' ? 'center' : 'right center',
                    transform: brand.name !== 'Xerox' ? 'scale(1.2)' : 'none'
                  }} 
                />
              </div>
              <h4 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#333' }}>{brand.name}</h4>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Partners = () => {
  return (
    <div style={{ padding: '4rem 0', background: 'white', borderBottom: '1px solid #F1F3F5', borderTop: '1px solid #F1F3F5' }}>
      <p style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#999', letterSpacing: '0.2em', marginBottom: '2.5rem' }}>PARCEIROS TECNOLÓGICOS</p>
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 5%' }}
      >
        <img src={LogosBannerImg} alt="Parceiros" style={{ maxWidth: '80%', height: 'auto', opacity: 0.9 }} />
      </motion.div>
    </div>
  );
};

const Services = () => {
  const items = [
    { 
      icon: <Printer size={36} color="var(--primary)" />, 
      title: "Locação Profissional", 
      desc: "Equipamentos de última geração com manutenção e suporte inclusos no contrato. Esqueça a depreciação e foque no seu negócio.",
      tag: "Solução Completa"
    },
    { 
      icon: <Truck size={36} color="var(--primary)" />, 
      title: "Gestão de Insumos", 
      desc: "Toners e peças originais com logística inteligente para sua empresa nunca parar. Reposição proativa baseada em uso real.",
      tag: "Logística Ágil"
    },
    { 
      icon: <BarChart3 size={36} color="var(--primary)" />, 
      title: "Digitalização e Scanners", 
      desc: "Transforme documentos físicos em digitais com alta velocidade, organização automática e segurança da informação.",
      tag: "Tecnologia"
    }
  ];

  return (
    <section id="servicos" style={{ padding: '120px 5%', background: 'linear-gradient(to bottom, #fff, #F8F9FA)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: '5rem' }}
        >
          <h2 style={{ fontSize: '2.8rem', marginBottom: '1rem', color: '#111' }}>Nossas <span style={{ color: 'var(--primary)' }}>Soluções</span></h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '700px', margin: '0 auto', fontSize: '1.1rem' }}>A excelência técnica que sua empresa merece, com o suporte que você confia.</p>
        </motion.div>

        <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '3rem' }}>
          {items.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: idx * 0.15, duration: 0.6 }}
              className="glass-card"
              style={{ 
                borderRadius: '32px', 
                overflow: 'hidden',
                padding: '3rem 2.5rem',
                position: 'relative',
                background: '#fff'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
                 <div style={{ padding: '14px', background: 'rgba(227,30,36,0.05)', borderRadius: '16px' }}>
                   {item.icon}
                 </div>
                 <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', background: 'rgba(227,30,36,0.08)', padding: '6px 12px', borderRadius: '8px' }}>{item.tag}</span>
              </div>
              <h3 style={{ fontSize: '1.6rem', marginBottom: '1rem', color: '#111' }}>{item.title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6 }}>{item.desc}</p>
              <a href="https://wa.me/555194412679" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '2.5rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.95rem' }}>
                Saber mais <ArrowUpRight size={18} />
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FeatureHighlight = () => {
  return (
    <section id="diferenciais" style={{ padding: '120px 5%', background: '#111', color: 'white', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: '40%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(227,30,36,0.1))', zIndex: 0 }}></div>
      
      <div className="responsive-grid" style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '6rem', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 style={{ fontSize: '3rem', marginBottom: '2.5rem', color: '#FFF', lineHeight: 1.1 }}>Por que escolher a <br /> <span style={{ color: 'var(--primary)' }}>LCD Digital</span>?</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div style={{ flexShrink: 0, width: '60px', height: '60px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={28} color="var(--primary)" />
              </div>
              <div>
                <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#FFF' }}>SLA de Atendimento Recorde</h4>
                <p style={{ color: '#AAA', fontSize: '1rem' }}>Temos o compromisso de resposta rápida para garantir que seu fluxo de trabalho nunca sofra interrupções prolongadas.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div style={{ flexShrink: 0, width: '60px', height: '60px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={28} color="var(--primary)" />
              </div>
              <div>
                <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#FFF' }}>Peças e Insumos Originais</h4>
                <p style={{ color: '#AAA', fontSize: '1rem' }}>Utilizamos apenas componentes originais para garantir a maior vida útil dos equipamentos e altíssima qualidade de impressão.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div style={{ flexShrink: 0, width: '60px', height: '60px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Headphones size={28} color="var(--primary)" />
              </div>
              <div>
                <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#FFF' }}>Suporte Técnico Especializado</h4>
                <p style={{ color: '#AAA', fontSize: '1rem' }}>Nossa equipe é constantemente treinada pelos fabricantes para resolver qualquer desafio técnico com agilidade ímpar.</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)', padding: '4rem', borderRadius: '40px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}
        >
          <h3 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', color: '#FFF' }}>Solicite um Diagnóstico de Custos</h3>
          <p style={{ color: '#AAA', marginBottom: '2.5rem', lineHeight: 1.7 }}>Entenda como podemos reduzir sua conta de impressão em até 40% com um parque otimizado e gestão de ponta a ponta.</p>
          <a href="https://wa.me/555194412679" target="_blank" rel="noreferrer" className="primary-button" style={{ width: '100%', textAlign: 'center', display: 'block', fontSize: '1.1rem', padding: '1.2rem' }}>Falar com Especialista</a>
          
          <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>100%</p>
              <p style={{ fontSize: '0.75rem', color: '#AAA', fontWeight: 600 }}>Insumos Originais</p>
            </div>
            <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>24h</p>
              <p style={{ fontSize: '0.75rem', color: '#AAA', fontWeight: 600 }}>Suporte Ativo</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer style={{ background: 'white', padding: '100px 5% 50px', borderTop: '1px solid #E9ECEF' }}>
      <div className="responsive-grid" style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '5rem' }}>
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
          <a href="https://maps.google.com" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '1.5rem', color: 'var(--primary)', fontWeight: 700 }}>
            Ver no Mapa <ArrowUpRight size={16} />
          </a>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: '6rem', paddingTop: '2.5rem', borderTop: '1px solid #F1F3F5', color: '#999', fontSize: '0.85rem' }}>
        © {new Date().getFullYear()} LCD DIGITAL - OUTSOURCING DE IMPRESSÃO. TODOS OS DIREITOS RESERVADOS.
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
      <div style={{ position: 'relative' }}>
        {/* Pulsing ring animation */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          borderRadius: '50%', border: '2px solid #25D366',
          animation: 'pulse-ring 2s infinite cubic-bezier(0.215, 0.61, 0.355, 1)'
        }}></div>
        
        <a 
          href="https://wa.me/555194412679?text=Ol%C3%A1%2C%20gostaria%20de%20um%20or%C3%A7amento!" 
          target="_blank"
          rel="noopener noreferrer"
          style={{ 
            background: '#25D366', width: '70px', height: '70px', borderRadius: '50%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            boxShadow: '0 15px 40px rgba(37, 211, 102, 0.4)',
            position: 'relative',
            zIndex: 2,
            transition: 'transform 0.3s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <MessageSquare color="white" size={32} />
          <span style={{ position: 'absolute', top: '0', right: '0', background: 'var(--primary)', color: 'white', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900, border: '2px solid white' }}>1</span>
        </a>
      </div>
    </motion.div>
  );
};

function App() {
  return (
    <div style={{ background: 'var(--bg-main)', minHeight: '100vh', overflowX: 'hidden' }}>
      <Navbar />
      <Hero />
      <Partners />
      <AboutUs />
      <Equipment />
      <Services />
      <FeatureHighlight />
      <Footer />
      <WhatsAppWidget />

      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .mobile-only { display: block !important; }
          
          .responsive-grid {
            grid-template-columns: 1fr !important;
            gap: 2.5rem !important;
          }

          /* Ajustes de tipografia e padding para mobile */
          h1 { font-size: 2.2rem !important; }
          h2 { font-size: 2rem !important; }
          section { padding-left: 20px !important; padding-right: 20px !important; padding-top: 80px !important; padding-bottom: 80px !important; }
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
