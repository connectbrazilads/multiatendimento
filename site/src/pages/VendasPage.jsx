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
  { value: '1 Tela', label: 'Cockpit completo com histórico, CRM e O.S. integrados' },
  { value: '24/7', label: 'Chatbot ativo e distribuição inteligente de contatos' },
  { value: '100%', label: 'Visibilidade de SLAs, atendimentos ativos e pendências' },
  { value: 'Zero', label: 'Ruído de comunicação e perda de histórico no repasse' },
];

const pains = [
  'Conversas e clientes espalhados em múltiplos celulares',
  'Cliente tendo que repetir o mesmo histórico para cada atendente',
  'Falta de métricas de tempo de resposta, SLAs e produtividade',
  'CRM, ordens de serviço e conversas isolados em sistemas diferentes',
];

const features = [
  {
    icon: MessageSquareMore,
    title: 'Inbox Unificada',
    text: 'Centralize todos os contatos do WhatsApp em um único painel. Distribua por departamentos, defina prioridades e gerencie filas de espera com total controle.',
  },
  {
    icon: Bot,
    title: 'Chatbot Inteligente',
    text: 'Responda instantaneamente aos clientes, colete informações essenciais na triagem e direcione a conversa para a equipe certa de forma automática.',
  },
  {
    icon: Users2,
    title: 'Gestão e Supervisão',
    text: 'Acompanhe em tempo real o desempenho dos atendentes, transfira conversas entre setores e monitore o histórico completo de interações.',
  },
  {
    icon: ScanSearch,
    title: 'Histórico e Ficha do Cliente',
    text: 'Acesse notas internas, tags de segmentação, arquivos de mídia e informações do CRM no painel lateral, sem interromper o fluxo da conversa.',
  },
  {
    icon: Workflow,
    title: 'Ordens de Serviço Integradas',
    text: 'Abra e gerencie O.S. diretamente da janela de chat para agilizar o suporte técnico, acompanhar prazos e manter o cliente sempre informado.',
  },
  {
    icon: BarChart3,
    title: 'Métricas e Relatórios',
    text: 'Monitore indicadores de desempenho (KPIs), tempo médio de atendimento, volume de conversas por setor e relatórios detalhados de satisfação.',
  },
];

const workflow = [
  {
    step: '01',
    title: 'Primeiro Contato',
    text: 'O cliente envia uma mensagem no WhatsApp e é imediatamente recebido pela plataforma.',
  },
  {
    step: '02',
    title: 'Triagem Automatizada',
    text: 'O chatbot interage para coletar dados iniciais, solucionando dúvidas frequentes ou direcionando o caso.',
  },
  {
    step: '03',
    title: 'Atendimento com Contexto',
    text: 'O operador humano assume a conversa já visualizando todo o histórico e informações fornecidas na triagem.',
  },
  {
    step: '04',
    title: 'Ação e Resolução',
    text: 'A equipe atualiza o CRM, gera ordens de serviço e soluciona o chamado diretamente pelo sistema.',
  },
];

const planHighlights = [
  'Atendentes por departamentos',
  'Múltiplas conexões de WhatsApp',
  'Chatbot e Triagem Inteligente',
  'CRM e Histórico Unificado',
  'Geração de O.S. na conversa',
  'Relatórios e Controle de SLAs',
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
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'bot' | 'crm'

  return (
    <div className="sales-preview-shell">
      <div className="sales-preview-window">
        <div className="sales-preview-topbar">
          <div className="sales-preview-dots">
            <span />
            <span />
            <span />
          </div>
          <div className="sales-preview-tabs">
            <button
              type="button"
              className={`sales-preview-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              Atendimento
            </button>
            <button
              type="button"
              className={`sales-preview-tab-btn ${activeTab === 'bot' ? 'active' : ''}`}
              onClick={() => setActiveTab('bot')}
            >
              Triagem Bot
            </button>
            <button
              type="button"
              className={`sales-preview-tab-btn ${activeTab === 'crm' ? 'active' : ''}`}
              onClick={() => setActiveTab('crm')}
            >
              CRM & O.S.
            </button>
          </div>
          <div className="sales-preview-breadcrumb">Dashboard</div>
        </div>

        <div className="sales-preview-body">
          <aside className="sales-preview-sidebar">
            <div className="sales-preview-sidebar-title">
              {activeTab === 'chat' && 'Filas'}
              {activeTab === 'bot' && 'Automação'}
              {activeTab === 'crm' && 'Integrações'}
            </div>
            
            {activeTab === 'chat' && (
              <>
                <div className="sales-preview-pill sales-preview-pill-active">Meus (08)</div>
                <div className="sales-preview-pill">Espera (12)</div>
                <div className="sales-preview-pill">Contatos (277)</div>
                <div className="sales-preview-list">
                  {['Comercial Rede Vip 24h', 'Gráfica Santos', 'Carol Almeida'].map((item, index) => (
                    <div key={item} className="sales-preview-ticket">
                      <div className="sales-preview-avatar">{item.slice(0, 2).toUpperCase()}</div>
                      <div className="sales-preview-ticket-copy">
                        <strong>{item}</strong>
                        <span>{index === 0 ? 'Atendimento ativo' : 'Fila Comercial'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'bot' && (
              <>
                <div className="sales-preview-pill sales-preview-pill-active">Fila Geral Bot</div>
                <div className="sales-preview-pill">Regras Ativas</div>
                <div className="sales-preview-pill">SLAs por Fila</div>
                <div className="sales-preview-list">
                  {['Menu Principal', 'Direcionamento', 'Horário Especial'].map((item) => (
                    <div key={item} className="sales-preview-ticket">
                      <div className="sales-preview-avatar">🤖</div>
                      <div className="sales-preview-ticket-copy">
                        <strong>{item}</strong>
                        <span>Bot Inteligente</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'crm' && (
              <>
                <div className="sales-preview-pill sales-preview-pill-active">Integração CRM</div>
                <div className="sales-preview-pill">Chamados O.S.</div>
                <div className="sales-preview-pill">Metas de SLA</div>
                <div className="sales-preview-list">
                  {['Rede Vip - O.S. #218', 'Santos - O.S. #214', 'Carol - O.S. #209'].map((item) => (
                    <div key={item} className="sales-preview-ticket">
                      <div className="sales-preview-avatar">⚙️</div>
                      <div className="sales-preview-ticket-copy">
                        <strong>{item.split(' - ')[0]}</strong>
                        <span>{item.split(' - ')[1]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </aside>

          <main className="sales-preview-chat">
            {activeTab === 'chat' && (
              <>
                <div className="sales-preview-chat-header">
                  <div>
                    <div className="sales-preview-kicker">Cliente ativo</div>
                    <strong>Comercial Rede Vip 24h</strong>
                  </div>
                  <div className="sales-preview-actions">
                    <button type="button">Abrir O.S.</button>
                    <button type="button">Ações</button>
                    <button type="button" className="sales-preview-primary">Encerrar</button>
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
              </>
            )}

            {activeTab === 'bot' && (
              <>
                <div className="sales-preview-chat-header">
                  <div>
                    <div className="sales-preview-kicker">Automação ativa</div>
                    <strong>Menu Geral de Triagem</strong>
                  </div>
                  <div className="sales-preview-actions">
                    <button type="button">Pausar Bot</button>
                    <button type="button" className="sales-preview-primary">Assumir Chat</button>
                  </div>
                </div>

                <div className="sales-preview-conversation">
                  <div className="sales-bubble sales-bubble-left">
                    <span>Olá, gostaria de falar com a empresa.</span>
                  </div>
                  <div className="sales-bubble sales-bubble-right sales-bubble-accent">
                    <span>Olá! Sou o assistente virtual da LCD Digital. Escolha uma opção:<br /><br />1️⃣ Suporte Técnico 🛠️<br />2️⃣ Planos & Preços 💰<br />3️⃣ Falar com Financeiro 💳</span>
                  </div>
                  <div className="sales-bubble sales-bubble-left">
                    <span>Opção 1 - Suporte Técnico</span>
                  </div>
                  <div className="sales-bubble sales-bubble-right sales-bubble-accent">
                    <span>Perfeito! Direcionando você para a fila de Suporte Técnico. Tempo estimado: 2 minutos.</span>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'crm' && (
              <>
                <div className="sales-preview-chat-header">
                  <div>
                    <div className="sales-preview-kicker">CRM e Integrações</div>
                    <strong>Ficha de: Comercial Rede Vip 24h</strong>
                  </div>
                  <div className="sales-preview-actions">
                    <button type="button" className="sales-preview-primary">Ver CRM Completo</button>
                  </div>
                </div>

                <div className="sales-preview-crm-view">
                  <div className="sales-crm-card">
                    <div className="sales-crm-header">
                      <strong>Informações do Contato</strong>
                      <span className="sales-crm-badge">Cliente VIP</span>
                    </div>
                    <div className="sales-crm-row">
                      <span>Razão Social:</span>
                      <strong>Rede Vip Comercial Ltda</strong>
                    </div>
                    <div className="sales-crm-row">
                      <span>CNPJ:</span>
                      <strong>12.345.678/0001-90</strong>
                    </div>
                    <div className="sales-crm-row">
                      <span>SLA Ativo:</span>
                      <strong className="sales-crm-sla">Prioridade Alta (Max 1h)</strong>
                    </div>
                    <div className="sales-crm-row">
                      <span>Notas do CRM:</span>
                      <span className="sales-crm-note">Cliente solicita técnico com experiência em multifuncionais xerox.</span>
                    </div>
                    <div className="sales-crm-btn-row">
                      <button type="button" className="sales-crm-action-btn">Criar Nova O.S.</button>
                      <button type="button" className="sales-crm-action-btn outline">Editar Cadastro</button>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="sales-preview-compose">
              <span>Digite uma mensagem...</span>
              <ArrowRight size={16} />
            </div>
          </main>
        </div>
      </div>

      <div className="sales-floating-card sales-floating-card-left">
        <Sparkles size={18} />
        <div>
          <strong>Resumo com IA</strong>
          <span>Contexto pronto para atendimento</span>
        </div>
      </div>

      <div className="sales-floating-card sales-floating-card-right">
        <ShieldCheck size={18} />
        <div>
          <strong>SLA e Governança</strong>
          <span>Tempo de resposta sob controle</span>
        </div>
      </div>
    </div>
  );
}

function ComparisonMatrix() {
  const categories = [
    {
      name: 'Múltiplos Atendentes',
      pessoal: 'Não (Apenas um)',
      business: 'Até 4 (Limite Web)',
      sistema: 'Ilimitado (Equipe Toda)',
    },
    {
      name: 'Conexão e Estabilidade',
      pessoal: 'Instável (Quedas do App)',
      business: 'Instável (Depende do Celular)',
      sistema: '100% Estável (API Cloud Oficial)',
    },
    {
      name: 'Fila de Espera e Setores',
      pessoal: 'Não (Bagunça no Chat)',
      business: 'Mensagem de ausência básica',
      sistema: 'Distribuição automática por setores',
    },
    {
      name: 'Risco de Bloqueio por Spam',
      pessoal: 'Altíssimo',
      business: 'Alto',
      sistema: 'Mínimo (Regras oficiais da Meta)',
    },
    {
      name: 'Abertura de O.S. & CRM',
      pessoal: 'Não possui',
      business: 'Não possui',
      sistema: 'Integrado diretamente na conversa',
    },
    {
      name: 'Relatórios & SLA',
      pessoal: 'Não possui',
      business: 'Não possui',
      sistema: 'Métricas completas em tempo real',
    },
  ];

  return (
    <section className="sales-section sales-comparison-section">
      <div className="sales-container">
        <div className="sales-section-head">
          <SectionTag>Comparativo Técnico</SectionTag>
          <h2>Por que empresas migram para a API Oficial com a LCD?</h2>
          <p>Entenda a diferença técnica e operacional entre as opções de WhatsApp e escolha a estabilidade e a governança para sua equipe.</p>
        </div>

        <div className="sales-comparison-wrapper">
          <table className="sales-comparison-table">
            <thead>
              <tr>
                <th>Recurso / Diferencial</th>
                <th>WhatsApp Pessoal</th>
                <th>WhatsApp Business</th>
                <th className="highlighted">Sistema LCD (API Oficial)</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, idx) => (
                <tr key={idx}>
                  <td><strong>{cat.name}</strong></td>
                  <td className="danger">{cat.pessoal}</td>
                  <td className="warning">{cat.business}</td>
                  <td className="success">{cat.sistema}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

const testimonialsData = [
  {
    quote: 'Reduzimos nosso tempo de primeira resposta de 45 minutos para apenas 40 segundos com a triagem inteligente. Nosso time comercial hoje atende o triplo de leads.',
    author: 'Nuala Ouverney',
    role: 'Gerente Comercial',
    company: 'Click Sophia',
    metric: 'Atendimento 3x mais ágil',
  },
  {
    quote: 'Centralizar as filiais em um único WhatsApp com painéis de SLA nos permitiu auditar a qualidade em tempo real. A segurança operacional é incomparável.',
    author: 'Alexandre Estefano',
    role: 'Sócio e Gestor',
    company: 'Velocità',
    metric: 'Zero conversas perdidas',
  },
  {
    quote: 'A integração direta de O.S. no chat salvou nossa operação de assistência técnica. O atendente abre o chamado em segundos sem sair da conversa.',
    author: 'Carol Almeida',
    role: 'Diretora Comercial',
    company: 'Gráfica Santos',
    metric: '+50% em eficiência',
  },
];

function Testimonials() {
  return (
    <section className="sales-section sales-testimonials-section">
      <div className="sales-container">
        <div className="sales-section-head">
          <SectionTag>Prova Social</SectionTag>
          <h2>Empresas que escalaram com o Sistema LCD Digital</h2>
          <p>Veja os resultados reais alcançados por gestores que profissionalizaram o atendimento no WhatsApp.</p>
        </div>

        <div className="sales-testimonials-grid">
          {testimonialsData.map((item, idx) => (
            <div key={idx} className="sales-testimonial-card">
              <span className="sales-testimonial-metric">{item.metric}</span>
              <p className="sales-testimonial-quote">"{item.quote}"</p>
              <div className="sales-testimonial-author">
                <div>
                  <strong>{item.author}</strong>
                  <span>{item.role}, {item.company}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const faqData = [
  {
    question: 'O sistema utiliza a API Oficial do WhatsApp?',
    answer: 'Sim, o sistema utiliza a Cloud API oficial fornecida pela Meta. Isso garante que a sua operação esteja 100% regularizada, com velocidade máxima de envio e zero risco de banimento por uso de automação autorizada.',
  },
  {
    question: 'Posso usar o meu número atual de WhatsApp?',
    answer: 'Sim, você pode migrar seu número atual (fixo ou celular) para a API Oficial. Durante o processo de onboarding, nós guiamos a transição para que não ocorra perda de sinal ou interrupção na sua operação comercial.',
  },
  {
    question: 'Preciso ter um CNPJ para utilizar o sistema?',
    answer: 'Sim. A Meta exige a validação comercial da conta para liberação da API Oficial, o que requer um CNPJ ativo (pode ser MEI, ME, LTDA, etc.) e um site ou página institucional no ar para provar a existência da marca.',
  },
  {
    question: 'Quantos atendentes podem trabalhar no mesmo número?',
    answer: 'Não há limite físico. Toda a sua equipe comercial, de suporte e faturamento pode acessar o painel unificado simultaneamente. Você distribui permissões de acordo com o cargo (agente, supervisor ou admin).',
  },
  {
    question: 'Como funciona a abertura de Ordens de Serviço (O.S.)?',
    answer: 'O atendente possui um painel lateral integrado à conversa de chat. Com um clique, ele abre a ficha de O.S., descreve a solicitação, anexa o histórico do chat e envia diretamente para o setor de execução, que avança o chamado no chamado Kanban.',
  },
];

function FAQAccordion() {
  const [activeIndex, setActiveIndex] = useState(null);

  const toggleAccordion = (idx) => {
    setActiveIndex(activeIndex === idx ? null : idx);
  };

  return (
    <section className="sales-section sales-faq-section">
      <div className="sales-container">
        <div className="sales-section-head">
          <SectionTag>Dúvidas Frequentes</SectionTag>
          <h2>Perguntas Frequentes sobre o Sistema</h2>
          <p>Tire suas dúvidas técnicas e comerciais para iniciar sua migração com total segurança.</p>
        </div>

        <div className="sales-faq-wrapper">
          {faqData.map((item, idx) => {
            const isOpen = activeIndex === idx;
            return (
              <div key={idx} className={`sales-faq-item ${isOpen ? 'open' : ''}`}>
                <button
                  type="button"
                  className="sales-faq-question"
                  onClick={() => toggleAccordion(idx)}
                >
                  <span>{item.question}</span>
                  <span className="sales-faq-icon">{isOpen ? '−' : '+'}</span>
                </button>
                <div className="sales-faq-answer">
                  <p>{item.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}


export default function VendasPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [leadForm, setLeadForm] = useState(defaultLeadForm);

  useEffect(() => {
    document.title = 'Sistema Multiatendimento | LCD Digital';
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
          <a className="sales-link-btn" href="https://crm.lcddigital.com.br/lcddigital/login" target="_blank" rel="noreferrer">Central de Atendimento</a>
          <a className="sales-link-btn" href="https://app.printwayy.com/Account/Login" target="_blank" rel="noreferrer">PrintWayy</a>
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
            <a href="https://crm.lcddigital.com.br/lcddigital/login" target="_blank" rel="noreferrer">Central de Atendimento</a>
            <a href="https://app.printwayy.com/Account/Login" target="_blank" rel="noreferrer">PrintWayy</a>
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
                Cockpit Unificado para WhatsApp, CRM e Equipes
              </SectionTag>

              <h1>
                Venda, atenda e gerencie sua operação no WhatsApp
                <span> em um só lugar.</span>
              </h1>

              <p>
                Acelere suas vendas e profissionalize seu suporte técnico. Centralize contatos, crie chatbots inteligentes de triagem e integre CRM e ordens de serviço diretamente no chat.
              </p>

              <div className="sales-hero-actions">
                <a className="sales-cta-btn sales-cta-btn-large" href="#captacao">
                  Agendar Demonstração
                  <ChevronRight size={18} />
                </a>
                <a className="sales-outline-btn" href="#produto">
                  Conhecer Recursos
                </a>
              </div>

              <div className="sales-trust-row">
                <div><CheckCircle2 size={16} /> Múltiplos atendentes com número único</div>
                <div><CheckCircle2 size={16} /> Histórico, tags e notas no mesmo painel</div>
                <div><CheckCircle2 size={16} /> Chatbot integrado e transferências sem atrito</div>
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
                Foco Operacional
              </SectionTag>
              <h2>Tudo o que sua equipe precisa em uma única tela.</h2>
              <p>
                Elimine a perda de tempo alternando entre abas do navegador, aplicativos e planilhas. Nossa plataforma unifica o chat do WhatsApp, a ficha cadastral do CRM e a abertura de chamados técnicos para manter sua operação em fluxo contínuo.
              </p>
            </div>

            <div className="sales-pain-board">
              <div className="sales-pain-title">O que eliminamos no seu dia a dia:</div>
              {pains.map((pain) => (
                <div key={pain} className="sales-pain-item">
                  <X size={16} className="sales-pain-icon" />
                  <span>{pain}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <ComparisonMatrix />

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
                Fluxo de Atendimento
              </SectionTag>
              <h2>Do primeiro "olá" à ordem de serviço no mesmo trilho.</h2>
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

        <Testimonials />

        <section className="sales-section sales-proof-section">
          <div className="sales-container sales-proof-grid">
            <div className="sales-proof-card">
              <SectionTag>
                <Headset size={14} />
                Alta Performance
              </SectionTag>
              <h2>Atendimento estruturado que transmite profissionalismo e confiança.</h2>
              <p>
                Sua empresa merece um canal de WhatsApp com nível de central de suporte corporativo. Entregue agilidade, rastreabilidade e um atendimento padronizado que fideliza clientes.
              </p>
            </div>

            <div className="sales-proof-points">
              <div>
                <Clock3 size={18} className="sales-proof-icon" />
                <div>
                  <strong>Tempo Médio de Resposta (TMA) Reduzido</strong>
                  <span>Triagem ágil que distribui as conversas para as pessoas certas em segundos.</span>
                </div>
              </div>
              <div>
                <PhoneCall size={18} className="sales-proof-icon" />
                <div>
                  <strong>Maior Conversão de Vendas</strong>
                  <span>Sua equipe comercial ganha agilidade com respostas rápidas e histórico à mão.</span>
                </div>
              </div>
              <div>
                <ShieldCheck size={18} className="sales-proof-icon" />
                <div>
                  <strong>Rastreabilidade Operacional</strong>
                  <span>Monitore SLAs, acompanhe metas de atendimento e audite conversas finalizadas.</span>
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
                  <Sparkles size={14} />
                  Nossos Planos
                </SectionTag>
                <h2>Tudo o que sua equipe precisa para crescer sem barreiras.</h2>
                <p>
                  Oferecemos um sistema escalável, sem taxas de adesão ou taxas ocultas de implantação. Desfrute de suporte humanizado e de uma plataforma em constante evolução tecnológica.
                </p>
                <a className="sales-cta-btn sales-cta-btn-large" href="#captacao">
                  Solicitar Proposta Comercial
                  <ArrowRight size={18} />
                </a>
              </div>

              <div className="sales-pricing-box">
                <div className="sales-pricing-kicker">Recursos inclusos no sistema:</div>
                {planHighlights.map((item) => (
                  <div key={item} className="sales-pricing-item">
                    <CheckCircle2 size={16} className="sales-pricing-check" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <FAQAccordion />

        <section id="captacao" className="sales-section">
          <div className="sales-container sales-lead-grid">
            <div className="sales-lead-copy">
              <SectionTag>
                <PhoneCall size={14} />
                Contato & Demonstração
              </SectionTag>
              <h2>Fale com um consultor e veja o sistema funcionando ao vivo.</h2>
              <p>
                Preencha os dados no formulário ao lado. Nossa equipe comercial entrará em contato rapidamente para entender as necessidades da sua operação e agendar uma demonstração sob medida para a sua equipe.
              </p>

              <div className="sales-lead-points">
                <div><CheckCircle2 size={16} className="sales-lead-check" /> Diagnóstico inicial do seu fluxo de atendimento</div>
                <div><CheckCircle2 size={16} className="sales-lead-check" /> Apresentação prática dos recursos e painéis</div>
                <div><CheckCircle2 size={16} className="sales-lead-check" /> Proposta comercial customizada para a sua empresa</div>
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
