import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Headset,
  LayoutDashboard,
  Menu,
  MessageSquareMore,
  PhoneCall,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Users2,
  Workflow,
  X,
} from 'lucide-react';
import LogoImg from '../assets/logo lcd.png';
import './vendas.css';

const navItems = [
  { label: 'Produto', href: '#produto' },
  { label: 'Recursos', href: '#recursos' },
  { label: 'Fluxo', href: '#fluxo' },
  { label: 'Planos', href: '#planos' },
];

const metrics = [
  { value: '1 tela', label: 'para fila, CRM, O.S. e histórico' },
  { value: '24/7', label: 'atendimento com bot, equipe e transferências' },
  { value: '100%', label: 'visão do cliente, SLA e contexto do contato' },
  { value: '-ruído', label: 'mais clareza para operar o time comercial' },
];

const pains = [
  'WhatsApp espalhado entre pessoas e aparelhos',
  'Cliente repetindo contexto a cada troca de atendente',
  'Sem visão clara de responsáveis, SLA e pendências',
  'O.S., CRM e conversa vivendo em sistemas separados',
];

const features = [
  {
    icon: MessageSquareMore,
    title: 'Inbox unificada',
    text: 'Centralize WhatsApp, filas, responsáveis, prioridades e histórico em uma operação mais simples de gerenciar.',
  },
  {
    icon: Bot,
    title: 'Bot + humano sem atrito',
    text: 'Automatize a primeira resposta, distribua conversas e preserve o contexto quando o atendimento virar humano.',
  },
  {
    icon: Users2,
    title: 'Equipe com governança',
    text: 'Acompanhe atendente, equipe, transferências, reaberturas e encerramentos sem perder rastreabilidade.',
  },
  {
    icon: ScanSearch,
    title: 'Ficha viva do cliente',
    text: 'Veja notas, tags, mídias, equipamentos, CRM vinculado e histórico do contato no mesmo fluxo.',
  },
  {
    icon: Workflow,
    title: 'O.S. no contexto',
    text: 'Gere ordens de serviço direto da conversa para acelerar diagnóstico, despacho e continuidade do atendimento.',
  },
  {
    icon: BarChart3,
    title: 'Visão operacional',
    text: 'Monitore o que está em atendimento, aguardando, encerrado e quais contas realmente exigem atenção.',
  },
];

const workflow = [
  {
    step: '01',
    title: 'Cliente chama no WhatsApp',
    text: 'A conversa entra na fila certa com identificação do contato e contexto inicial.',
  },
  {
    step: '02',
    title: 'Bot ou triagem assume',
    text: 'Você responde automaticamente, coleta dados essenciais e envia para a equipe certa.',
  },
  {
    step: '03',
    title: 'Operador atende com contexto',
    text: 'O atendente já entra vendo histórico, CRM, prioridade, mídias e tudo que o cliente já informou.',
  },
  {
    step: '04',
    title: 'Conversa vira operação',
    text: 'Se precisar, a equipe gera O.S., registra andamento e fecha o ciclo sem sair da plataforma.',
  },
];

const planHighlights = [
  'Inbox por equipes',
  'Múltiplas conexões',
  'Bot inicial',
  'CRM e ficha do cliente',
  'Geração de O.S.',
  'Histórico completo',
];

const defaultLeadForm = {
  name: '',
  company: '',
  phone: '',
  email: '',
  teamSize: '',
  challenge: '',
};

function buildWhatsAppLeadUrl(form) {
  const lines = [
    'Olá, quero conhecer o sistema de multiatendimento.',
    '',
    `Nome: ${form.name}`,
    `Empresa: ${form.company}`,
    `WhatsApp: ${form.phone}`,
    `E-mail: ${form.email}`,
    `Tamanho da equipe: ${form.teamSize || 'Não informado'}`,
    `Principal desafio: ${form.challenge || 'Não informado'}`,
  ];

  return `https://wa.me/555194412679?text=${encodeURIComponent(lines.join('\n'))}`;
}

function SectionTag({ children }) {
  return <div className="sales-tag">{children}</div>;
}

function ProductPreview() {
  return (
    <div className="sales-preview-shell">
      <div className="sales-preview-window">
        <div className="sales-preview-topbar">
          <div className="sales-preview-dots">
            <span />
            <span />
            <span />
          </div>
          <div className="sales-preview-breadcrumb">Operação comercial em tempo real</div>
        </div>

        <div className="sales-preview-body">
          <aside className="sales-preview-sidebar">
            <div className="sales-preview-sidebar-title">Filas</div>
            <div className="sales-preview-pill sales-preview-pill-active">Meus 08</div>
            <div className="sales-preview-pill">Espera 12</div>
            <div className="sales-preview-pill">Contatos 277</div>

            <div className="sales-preview-list">
              {['Comercial Rede Vip 24h', 'Gráfica Santos', 'Carol Almeida'].map((item, index) => (
                <div key={item} className="sales-preview-ticket">
                  <div className="sales-preview-avatar">{item.slice(0, 2).toUpperCase()}</div>
                  <div className="sales-preview-ticket-copy">
                    <strong>{item}</strong>
                    <span>{index === 0 ? 'Atendimento em aberto' : 'Fila LCD-ATENDIMENTO'}</span>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <main className="sales-preview-chat">
            <div className="sales-preview-chat-header">
              <div>
                <div className="sales-preview-kicker">Cliente ativo</div>
                <strong>Comercial Rede Vip 24h</strong>
              </div>
              <div className="sales-preview-actions">
                <button>Gerar O.S.</button>
                <button>Ações</button>
                <button className="sales-preview-primary">Encerrar</button>
              </div>
            </div>

            <div className="sales-preview-conversation">
              <div className="sales-bubble sales-bubble-left">
                <span>Boa tarde, preciso de suporte com a impressora da loja.</span>
              </div>
              <div className="sales-bubble sales-bubble-right">
                <span>Já localizei seu cadastro e vou te ajudar agora.</span>
              </div>
              <div className="sales-bubble sales-bubble-right sales-bubble-accent">
                <span>Se necessário, já gero a O.S. com o histórico dessa conversa.</span>
              </div>
            </div>

            <div className="sales-preview-compose">
              <span>Digite uma mensagem</span>
              <ArrowRight size={16} />
            </div>
          </main>
        </div>
      </div>

      <div className="sales-floating-card sales-floating-card-left">
        <Sparkles size={18} />
        <div>
          <strong>Resumo IA</strong>
          <span>Contexto pronto para transferência</span>
        </div>
      </div>

      <div className="sales-floating-card sales-floating-card-right">
        <ShieldCheck size={18} />
        <div>
          <strong>Controle operacional</strong>
          <span>Fila, histórico, SLA e responsável</span>
        </div>
      </div>
    </div>
  );
}

export default function VendasPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [leadForm, setLeadForm] = useState(defaultLeadForm);

  useEffect(() => {
    document.title = 'Vendas | Sistema Multiatendimento LCD';
  }, []);

  function handleLeadChange(event) {
    const { name, value } = event.target;
    setLeadForm((current) => ({ ...current, [name]: value }));
  }

  function handleLeadSubmit(event) {
    event.preventDefault();
    window.open(buildWhatsAppLeadUrl(leadForm), '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="sales-page">
      <header className="sales-navbar">
        <a className="sales-brand" href="#top" aria-label="LCD Digital Vendas">
          <img src={LogoImg} alt="LCD Digital" />
          <div>
            <strong>Sistema Multiatendimento</strong>
            <span>Vendas</span>
          </div>
        </a>

        <nav className="sales-nav-links">
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>{item.label}</a>
          ))}
        </nav>

        <div className="sales-nav-actions">
          <a className="sales-link-btn" href="https://crm.lcddigital.com.br/lcddigital/login" target="_blank" rel="noreferrer">Entrar</a>
          <a className="sales-cta-btn" href="https://wa.me/555194412679?text=Quero%20conhecer%20o%20sistema%20de%20multiatendimento" target="_blank" rel="noreferrer">
            Falar com vendas
          </a>
          <button className="sales-mobile-menu-btn" type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menu">
            <Menu size={22} />
          </button>
        </div>
      </header>

      {mobileMenuOpen ? (
        <div className="sales-mobile-panel">
          <div className="sales-mobile-panel-head">
            <strong>Menu</strong>
            <button type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Fechar menu">
              <X size={20} />
            </button>
          </div>
          <div className="sales-mobile-links">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>{item.label}</a>
            ))}
            <a href="https://crm.lcddigital.com.br/lcddigital/login" target="_blank" rel="noreferrer">Entrar</a>
            <a href="https://wa.me/555194412679?text=Quero%20conhecer%20o%20sistema%20de%20multiatendimento" target="_blank" rel="noreferrer">Falar com vendas</a>
          </div>
        </div>
      ) : null}

      <main id="top">
        <section className="sales-hero">
          <div className="sales-orb sales-orb-a" />
          <div className="sales-orb sales-orb-b" />

          <div className="sales-container sales-hero-grid">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="sales-hero-copy"
            >
              <SectionTag>
                <BadgeCheck size={14} />
                Plataforma para atendimento, CRM e operação em uma só tela
              </SectionTag>

              <h1>
                Venda, atenda e acompanhe seu time no WhatsApp
                <span> sem perder contexto.</span>
              </h1>

              <p>
                O sistema multiatendimento da LCD organiza filas, atendentes, bot, histórico, CRM e ordem de serviço em um fluxo operacional claro, rápido e comercialmente forte.
              </p>

              <div className="sales-hero-actions">
                <a className="sales-cta-btn sales-cta-btn-large" href="https://wa.me/555194412679?text=Quero%20agendar%20uma%20demo%20do%20sistema" target="_blank" rel="noreferrer">
                  Agendar demonstração
                  <ChevronRight size={18} />
                </a>
                <a className="sales-outline-btn" href="#produto">
                  Ver produto
                </a>
              </div>

              <div className="sales-trust-row">
                <div><CheckCircle2 size={16} /> Múltiplos atendentes na mesma operação</div>
                <div><CheckCircle2 size={16} /> Histórico, mídias e CRM no contexto</div>
                <div><CheckCircle2 size={16} /> Bot, equipe e O.S. sem troca de tela</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="sales-hero-visual"
            >
              <ProductPreview />
            </motion.div>
          </div>
        </section>

        <section className="sales-metrics">
          <div className="sales-container sales-metrics-grid">
            {metrics.map((item) => (
              <div key={item.label} className="sales-metric-card">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="produto" className="sales-section">
          <div className="sales-container sales-split">
            <div className="sales-section-copy">
              <SectionTag>
                <LayoutDashboard size={14} />
                O produto
              </SectionTag>
              <h2>Uma operação comercial inteira concentrada em um único cockpit.</h2>
              <p>
                Em vez de alternar entre WhatsApp, CRM, planilhas e mensagens internas, sua equipe trabalha com uma visão única do atendimento. Isso reduz ruído, acelera resposta e melhora a passagem de contexto.
              </p>
            </div>

            <div className="sales-pain-board">
              <div className="sales-pain-title">O que a página resolve no dia a dia</div>
              {pains.map((pain) => (
                <div key={pain} className="sales-pain-item">
                  <X size={16} />
                  <span>{pain}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="recursos" className="sales-section sales-section-muted">
          <div className="sales-container">
            <div className="sales-section-head">
              <SectionTag>
                <Sparkles size={14} />
                Recursos principais
              </SectionTag>
              <h2>Recursos pensados para quem precisa vender, atender e operar ao mesmo tempo.</h2>
            </div>

            <div className="sales-feature-grid">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.article
                    key={feature.title}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: index * 0.05 }}
                    className="sales-feature-card"
                  >
                    <div className="sales-feature-icon">
                      <Icon size={22} />
                    </div>
                    <h3>{feature.title}</h3>
                    <p>{feature.text}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="fluxo" className="sales-section">
          <div className="sales-container">
            <div className="sales-section-head sales-section-head-left">
              <SectionTag>
                <Workflow size={14} />
                Fluxo operacional
              </SectionTag>
              <h2>Do primeiro "olá" até a ordem de serviço, tudo evolui no mesmo trilho.</h2>
            </div>

            <div className="sales-workflow-grid">
              {workflow.map((item) => (
                <div key={item.step} className="sales-workflow-card">
                  <span className="sales-workflow-step">{item.step}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="sales-section sales-proof-section">
          <div className="sales-container sales-proof-grid">
            <div className="sales-proof-card">
              <SectionTag>
                <Headset size={14} />
                Para operações reais
              </SectionTag>
              <h2>Atendimento com cara de operação séria, não de gambiarra improvisada.</h2>
              <p>
                O foco dessa landing é mostrar exatamente o que seu cliente enxerga em valor: velocidade, organização, contexto, controle e equipe alinhada.
              </p>
            </div>

            <div className="sales-proof-points">
              <div>
                <Clock3 size={18} />
                <div>
                  <strong>Menos tempo perdido</strong>
                  <span>com trocas de tela e repasse manual de informações.</span>
                </div>
              </div>
              <div>
                <PhoneCall size={18} />
                <div>
                  <strong>Mais resposta comercial</strong>
                  <span>com filas organizadas e visão clara do que exige ação.</span>
                </div>
              </div>
              <div>
                <ShieldCheck size={18} />
                <div>
                  <strong>Mais previsibilidade</strong>
                  <span>com histórico, responsáveis e eventos registrados na conversa.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="planos" className="sales-section sales-section-muted">
          <div className="sales-container">
            <div className="sales-pricing-card">
              <div className="sales-pricing-copy">
                <SectionTag>
                  <BadgeCheck size={14} />
                  Página de vendas inicial
                </SectionTag>
                <h2>Podemos evoluir esta landing depois, mas ela já nasce pronta para vender.</h2>
                <p>
                  Por enquanto deixei a página como `vendas`, com foco em apresentação comercial do sistema. O próximo passo pode ser integrar formulário, prova social, vídeo demo e variações por segmento.
                </p>
                <a className="sales-cta-btn sales-cta-btn-large" href="https://wa.me/555194412679?text=Quero%20usar%20essa%20landing%20de%20vendas%20do%20sistema" target="_blank" rel="noreferrer">
                  Continuar evoluindo
                  <ArrowRight size={18} />
                </a>
              </div>

              <div className="sales-pricing-box">
                <div className="sales-pricing-kicker">Inclui nesta versão</div>
                {planHighlights.map((item) => (
                  <div key={item} className="sales-pricing-item">
                    <CheckCircle2 size={16} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="captacao" className="sales-section">
          <div className="sales-container sales-lead-grid">
            <div className="sales-lead-copy">
              <SectionTag>
                <PhoneCall size={14} />
                Captação comercial
              </SectionTag>
              <h2>Se a página te convenceu, o próximo passo é transformar interesse em lead qualificado.</h2>
              <p>
                Este formulário já coleta os dados principais da oportunidade e abre o WhatsApp da LCD com a mensagem pronta, deixando o atendimento comercial mais organizado desde o primeiro contato.
              </p>

              <div className="sales-lead-points">
                <div><CheckCircle2 size={16} /> Nome, empresa, contato e tamanho da operação</div>
                <div><CheckCircle2 size={16} /> Mensagem estruturada direto para o WhatsApp comercial</div>
                <div><CheckCircle2 size={16} /> Ideal para avaliar antes de apontar um domínio final</div>
              </div>
            </div>

            <form className="sales-lead-form" onSubmit={handleLeadSubmit}>
              <div className="sales-form-grid">
                <label className="sales-field">
                  <span>Seu nome</span>
                  <input name="name" value={leadForm.name} onChange={handleLeadChange} placeholder="Ex: Diego Cabral" required />
                </label>

                <label className="sales-field">
                  <span>Empresa</span>
                  <input name="company" value={leadForm.company} onChange={handleLeadChange} placeholder="Ex: LCD Digital" required />
                </label>

                <label className="sales-field">
                  <span>WhatsApp</span>
                  <input name="phone" value={leadForm.phone} onChange={handleLeadChange} placeholder="(51) 99999-9999" required />
                </label>

                <label className="sales-field">
                  <span>E-mail</span>
                  <input name="email" type="email" value={leadForm.email} onChange={handleLeadChange} placeholder="voce@empresa.com" required />
                </label>

                <label className="sales-field sales-field-full">
                  <span>Tamanho da equipe de atendimento</span>
                  <select name="teamSize" value={leadForm.teamSize} onChange={handleLeadChange}>
                    <option value="">Selecione</option>
                    <option value="1 a 3 atendentes">1 a 3 atendentes</option>
                    <option value="4 a 10 atendentes">4 a 10 atendentes</option>
                    <option value="11 a 25 atendentes">11 a 25 atendentes</option>
                    <option value="Mais de 25 atendentes">Mais de 25 atendentes</option>
                  </select>
                </label>

                <label className="sales-field sales-field-full">
                  <span>Principal desafio hoje</span>
                  <textarea
                    name="challenge"
                    value={leadForm.challenge}
                    onChange={handleLeadChange}
                    rows={4}
                    placeholder="Ex: organizar o WhatsApp comercial, distribuir atendimentos e gerar O.S. sem perder contexto."
                  />
                </label>
              </div>

              <button className="sales-cta-btn sales-cta-btn-large sales-form-submit" type="submit">
                Enviar para vendas no WhatsApp
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
