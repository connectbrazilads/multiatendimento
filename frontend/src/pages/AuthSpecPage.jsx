import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock3,
  FileLock2,
  Fingerprint,
  KeyRound,
  Layers3,
  LockKeyhole,
  MailCheck,
  MoonStar,
  ScanSearch,
  ShieldCheck,
  SunMedium,
  UserCog,
  UserPlus,
  Users2,
} from 'lucide-react';
import AuthSpecBadge from '../components/authSpec/AuthSpecBadge';
import AuthSpecSection from '../components/authSpec/AuthSpecSection';
import AuthSpecSidebar from '../components/authSpec/AuthSpecSidebar';

const sections = [
  { id: 'overview', label: 'Visão Geral', code: '00' },
  { id: 'login', label: 'Tela de Login', code: '01' },
  { id: 'signup', label: 'Auto Cadastro', code: '02' },
  { id: 'recovery', label: 'Recuperação de Senha', code: '03' },
  { id: 'non-functional', label: 'Requisitos Não Funcionais', code: '04' },
  { id: 'timeline', label: 'Timeline de Autenticação', code: '05' },
];

const overviewMetrics = [
  { label: 'Perfis de acesso', value: '2', detail: 'Clientes e fornecedores com regras distintas.' },
  { label: 'Fluxos cobertos', value: '3', detail: 'Login, cadastro e recuperação de senha.' },
  { label: 'Pontos de controle', value: '9', detail: 'Segurança, validação, auditoria e comunicação.' },
  { label: 'Nível de prontidão', value: 'MVP+', detail: 'Especificação preparada para discovery técnico e refinamento.' },
];

const loginFieldRows = [
  {
    id: 'FR-LOG-01',
    title: 'Identificação do usuário',
    description: 'A tela deve exigir e-mail válido como identificador primário para ambos os perfis.',
    tags: ['Obrigatório', 'Validação síncrona'],
  },
  {
    id: 'FR-LOG-02',
    title: 'Senha mascarada',
    description: 'Campo com alternância de visibilidade, suporte a colagem e bloqueio de autocomplete inseguro.',
    tags: ['UX', 'Segurança'],
  },
  {
    id: 'FR-LOG-03',
    title: 'Contexto do perfil',
    description: 'O backend deve identificar automaticamente se o usuário pertence ao domínio cliente ou fornecedor após autenticação.',
    tags: ['Backoffice', 'Regra de negócio'],
  },
];

const loginRuleRows = [
  {
    id: 'FR-LOG-04',
    title: 'Tentativas inválidas',
    description: 'Após 5 falhas consecutivas em 15 minutos, a conta deve entrar em estado de proteção e exigir espera progressiva ou verificação adicional.',
    tags: ['Alta criticidade', 'Rate limit'],
  },
  {
    id: 'FR-LOG-05',
    title: 'Sessão autenticada',
    description: 'Em autenticação bem-sucedida, emitir access token de curta duração e refresh token rotativo vinculado ao dispositivo.',
    tags: ['JWT/Session', 'Auditoria'],
  },
  {
    id: 'FR-LOG-06',
    title: 'Fallback operacional',
    description: 'Quando o serviço de identidade estiver indisponível, exibir estado degradado com orientação objetiva e registro de incidente.',
    tags: ['Disponibilidade', 'Suporte'],
  },
];

const signupClientRows = [
  {
    id: 'FR-CAD-CLI-01',
    title: 'Dados cadastrais mínimos',
    description: 'Nome completo, e-mail, CPF, celular, senha e aceite de termos devem ser obrigatórios.',
  },
  {
    id: 'FR-CAD-CLI-02',
    title: 'Validação documental',
    description: 'CPF deve passar por máscara, normalização e verificação algorítmica antes da submissão.',
  },
  {
    id: 'FR-CAD-CLI-03',
    title: 'Ativação da conta',
    description: 'Conta de cliente pode ser ativada por e-mail após verificação de unicidade e aceite de consentimentos.',
  },
];

const signupVendorRows = [
  {
    id: 'FR-CAD-FOR-01',
    title: 'Dados corporativos obrigatórios',
    description: 'Razão social, nome fantasia, CNPJ, e-mail corporativo, telefone, responsável legal e senha.',
  },
  {
    id: 'FR-CAD-FOR-02',
    title: 'Onboarding com compliance',
    description: 'Fornecedor entra com status Pendente até concluir validação documental e aprovação operacional.',
  },
  {
    id: 'FR-CAD-FOR-03',
    title: 'Conta principal',
    description: 'O primeiro cadastro define o usuário administrador do fornecedor, com gestão posterior de acessos internos.',
  },
];

const recoveryRows = [
  {
    id: 'FR-REC-01',
    title: 'Solicitação segura',
    description: 'O sistema deve aceitar solicitação por e-mail sem revelar se a conta existe na base.',
    tags: ['Anti enumeração', 'Privacidade'],
  },
  {
    id: 'FR-REC-02',
    title: 'Token temporário',
    description: 'O link deve expirar em 15 minutos, ser de uso único e invalidar tokens anteriores ainda não utilizados.',
    tags: ['Criptografia', 'Tempo de vida'],
  },
  {
    id: 'FR-REC-03',
    title: 'Encerramento de sessões',
    description: 'Ao redefinir a senha, todas as sessões ativas devem ser encerradas e o usuário notificado por e-mail.',
    tags: ['Containment', 'Auditoria'],
  },
];

const nfrRows = [
  {
    id: 'NFR-SEC-01',
    title: 'Segurança e criptografia',
    description: 'Senhas armazenadas com hash resistente a força bruta, transporte exclusivamente em TLS 1.2+ e segredos segregados por ambiente.',
    metric: 'Zero armazenamento reversível',
  },
  {
    id: 'NFR-PER-01',
    title: 'Performance percebida',
    description: 'Tempo de resposta da autenticação inferior a 2 segundos no percentil 95, excluindo indisponibilidade de terceiros.',
    metric: 'p95 < 2s',
  },
  {
    id: 'NFR-AUD-01',
    title: 'Auditoria e observabilidade',
    description: 'Registrar autenticações, falhas, resets, bloqueios e mudanças de perfil com correlação por request id.',
    metric: 'Retenção mínima de 180 dias',
  },
  {
    id: 'NFR-SCL-01',
    title: 'Escalabilidade',
    description: 'Camada de autenticação preparada para crescimento horizontal e filas assíncronas para e-mails e validações externas.',
    metric: 'Arquitetura stateless',
  },
  {
    id: 'NFR-RES-01',
    title: 'Responsividade',
    description: 'Experiência íntegra a partir de 360px, com foco em navegação móvel para clientes e fornecedores em campo.',
    metric: 'Mobile first validado',
  },
  {
    id: 'NFR-LOG-01',
    title: 'Logs operacionais',
    description: 'Mensagens estruturadas, sem dados sensíveis, com alertas para anomalias de acesso e picos de falha.',
    metric: 'Mascaramento obrigatório',
  },
];

const timelineSteps = [
  {
    title: 'Descoberta de contexto',
    detail: 'Usuário escolhe entrar, criar conta ou redefinir senha a partir da home de autenticação.',
    icon: ScanSearch,
  },
  {
    title: 'Validação de identidade',
    detail: 'Backend valida formato, unicidade, status da conta, reputação da tentativa e eventuais bloqueios ativos.',
    icon: Fingerprint,
  },
  {
    title: 'Decisão de fluxo',
    detail: 'A plataforma direciona para sessão ativa, onboarding pendente, confirmação por e-mail ou redefinição assistida.',
    icon: Layers3,
  },
  {
    title: 'Persistência e auditoria',
    detail: 'Cada transição relevante grava eventos com rastreabilidade para segurança, suporte e analytics.',
    icon: FileLock2,
  },
];

const messageCards = [
  {
    type: 'Sucesso',
    tone: 'success',
    text: 'Acesso validado com sucesso. Redirecionando para seu painel.',
  },
  {
    type: 'Erro de credenciais',
    tone: 'danger',
    text: 'Não foi possível validar suas credenciais. Revise e tente novamente.',
  },
  {
    type: 'Bloqueio temporário',
    tone: 'warning',
    text: 'Detectamos múltiplas tentativas inválidas. Aguarde alguns minutos antes de tentar novamente.',
  },
  {
    type: 'Ação pendente',
    tone: 'info',
    text: 'Seu cadastro foi recebido e está aguardando verificação de e-mail e aprovação operacional.',
  },
];

export default function AuthSpecPage() {
  const [theme, setTheme] = useState(() => localStorage.getItem('auth-spec-theme') || 'dark');
  const [activeSection, setActiveSection] = useState('overview');
  const [expandedSections, setExpandedSections] = useState({
    login: true,
    signup: true,
    recovery: true,
    'non-functional': true,
  });

  useEffect(() => {
    localStorage.setItem('auth-spec-theme', theme);
  }, [theme]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visibleEntry?.target?.id) {
          setActiveSection(visibleEntry.target.id);
        }
      },
      {
        rootMargin: '-20% 0px -55% 0px',
        threshold: [0.2, 0.4, 0.6],
      },
    );

    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  function toggleSection(sectionId) {
    setExpandedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_38%,#f8fafc_100%)] text-slate-900 transition-colors duration-300 dark:bg-[radial-gradient(circle_at_top,#0f172a_0%,#020617_45%,#020617_100%)] dark:text-slate-100">
        <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <AuthSpecSidebar
            sections={sections}
            activeSection={activeSection}
            theme={theme}
            onThemeToggle={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          />

          <main className="min-w-0 flex-1">
            <div className="space-y-6">
              <header className="rounded-[30px] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/76 dark:shadow-[0_30px_90px_rgba(2,6,23,0.45)] sm:p-8">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <AuthSpecBadge variant="info">Product Discovery</AuthSpecBadge>
                      <AuthSpecBadge variant="success">Scope validado</AuthSpecBadge>
                      <AuthSpecBadge variant="warning">Aprovação pendente</AuthSpecBadge>
                    </div>

                    <div className="space-y-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                        Plataforma de compras online
                      </p>
                      <h1 className="max-w-4xl font-[var(--font-display)] text-4xl tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                        Especificação funcional do sistema de autenticação para clientes e fornecedores.
                      </h1>
                      <p className="max-w-3xl text-base leading-8 text-slate-600 dark:text-slate-300">
                        Este artefato consolida requisitos funcionais, controles de segurança e critérios operacionais para a jornada de acesso de uma plataforma transacional B2C/B2B. O foco é garantir conversão com governança, fluidez de onboarding e rastreabilidade enterprise.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:w-[360px] xl:grid-cols-1">
                    <MetaCard label="Owner" value="Product + Security" detail="Alinhamento entre experiência, risco e suporte." />
                    <MetaCard label="Última revisão" value="19 mai 2026" detail="Versão preparada para validação com cliente." />
                    <MetaCard label="Canais impactados" value="Web responsive" detail="Fluxos acessíveis em desktop e mobile." />
                  </div>
                </div>

                <div className="mt-6 flex gap-3 overflow-x-auto pb-1 lg:hidden">
                  {sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className={[
                        'whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition',
                        activeSection === section.id
                          ? 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300'
                          : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300',
                      ].join(' ')}
                    >
                      {section.label}
                    </a>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  >
                    {theme === 'dark' ? <SunMedium size={16} /> : <MoonStar size={16} />}
                    {theme === 'dark' ? 'Light' : 'Dark'}
                  </button>
                </div>
              </header>

              <section id="overview" className="scroll-mt-24 space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {overviewMetrics.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[26px] border border-slate-200/80 bg-white/82 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-[0_24px_72px_rgba(2,6,23,0.42)]"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        {item.label}
                      </p>
                      <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                        {item.value}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
                  <div className="rounded-[30px] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/76 dark:shadow-[0_28px_80px_rgba(2,6,23,0.45)] sm:p-8">
                    <SectionKicker icon={ShieldCheck} title="Objetivo do fluxo de autenticação" />
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <NarrativeCard
                        title="Cliente"
                        icon={Users2}
                        text="Priorizar entrada simples, auto cadastro com validação documental e recuperação de senha descomplicada para suportar conversão de compra."
                      />
                      <NarrativeCard
                        title="Fornecedor"
                        icon={Building2}
                        text="Adicionar camada de governança com validações corporativas, aprovação operacional e trilha de auditoria reforçada para acesso à plataforma."
                      />
                    </div>

                    <div className="mt-6 rounded-[26px] border border-slate-200 bg-slate-50/90 p-5 dark:border-slate-800 dark:bg-slate-950/70">
                      <div className="flex flex-wrap items-center gap-3">
                        <AuthSpecBadge variant="danger">Crítico</AuthSpecBadge>
                        <AuthSpecBadge variant="info">LGPD friendly</AuthSpecBadge>
                        <AuthSpecBadge variant="success">Pronto para refinamento</AuthSpecBadge>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
                        O desenho considera proteção contra enumeração de contas, limitação de tentativas inválidas, revisão documental de fornecedores e comunicação transacional consistente em todos os eventos sensíveis.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[30px] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/76 dark:shadow-[0_28px_80px_rgba(2,6,23,0.45)] sm:p-8">
                    <SectionKicker icon={AlertTriangle} title="Mapa de criticidade" />
                    <div className="mt-6 space-y-4">
                      <CriticalityRow
                        label="Credenciais e sessão"
                        variant="danger"
                        detail="Maior exposição a fraude, takeover e suporte."
                      />
                      <CriticalityRow
                        label="Auto cadastro fornecedor"
                        variant="warning"
                        detail="Risco operacional se documentos ou papéis forem aprovados sem validação."
                      />
                      <CriticalityRow
                        label="Reset de senha"
                        variant="info"
                        detail="Ponto sensível de engenharia social e abuso de token."
                      />
                      <CriticalityRow
                        label="Observabilidade"
                        variant="success"
                        detail="Base para resposta a incidentes e melhoria contínua."
                      />
                    </div>
                  </div>
                </div>
              </section>

              <AuthSpecSection
                id="login"
                title="Tela de Login"
                eyebrow="Fluxo 01"
                icon={LockKeyhole}
                expanded={expandedSections.login}
                onToggle={() => toggleSection('login')}
                summary="A experiência de login deve ser objetiva, segura e resiliente a fraude. O sistema precisa autenticar clientes e fornecedores com os mesmos campos base, mas aplicar regras contextuais de sessão e bloqueio conforme perfil e risco da tentativa."
                badges={[
                  <AuthSpecBadge key="b1" variant="danger">Segurança crítica</AuthSpecBadge>,
                  <AuthSpecBadge key="b2" variant="success">Conversão assistida</AuthSpecBadge>,
                  <AuthSpecBadge key="b3" variant="info">Auditoria obrigatória</AuthSpecBadge>,
                ]}
              >
                <div className="space-y-8">
                  <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
                    <div className="space-y-6">
                      <SpecMatrix title="Campos obrigatórios e validações" rows={loginFieldRows} />
                      <SpecMatrix title="Regras de negócio e autenticação" rows={loginRuleRows} />
                    </div>

                    <div className="space-y-6">
                      <CalloutCard
                        icon={ShieldCheck}
                        title="Controles de segurança"
                        items={[
                          'Hash de senha com algoritmo resistente a brute force e política de rotação de credenciais comprometidas.',
                          'Rate limit por IP, fingerprint do dispositivo e identidade para contenção de abuso automatizado.',
                          'Sessão revogável, refresh token rotativo e invalidação automática após logout, reset ou bloqueio.',
                        ]}
                      />
                      <CalloutCard
                        icon={MailCheck}
                        title="Mensagens e feedbacks"
                        items={[
                          'Falha genérica sem expor existência da conta.',
                          'Sucesso com redirecionamento contextual para o dashboard do perfil autenticado.',
                          'Estado de conta bloqueada com instrução de suporte ou redefinição de senha.',
                        ]}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {messageCards.map((message) => (
                      <div key={message.type} className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-5 dark:border-slate-800 dark:bg-slate-950/70">
                        <AuthSpecBadge variant={message.tone}>{message.type}</AuthSpecBadge>
                        <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{message.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </AuthSpecSection>

              <AuthSpecSection
                id="signup"
                title="Tela de Auto Cadastro"
                eyebrow="Fluxo 02"
                icon={UserPlus}
                expanded={expandedSections.signup}
                onToggle={() => toggleSection('signup')}
                summary="O auto cadastro precisa separar claramente os dois perfis desde o início da jornada, minimizando fricção para clientes e reforçando validações corporativas para fornecedores. O desenho prevê regras próprias de obrigatoriedade, aprovação e comunicação pós-cadastro."
                badges={[
                  <AuthSpecBadge key="b1" variant="success">Onboarding guiado</AuthSpecBadge>,
                  <AuthSpecBadge key="b2" variant="warning">Compliance fornecedor</AuthSpecBadge>,
                  <AuthSpecBadge key="b3" variant="info">Unicidade transversal</AuthSpecBadge>,
                ]}
              >
                <div className="space-y-8">
                  <div className="grid gap-6 xl:grid-cols-2">
                    <ProfilePanel
                      title="Cliente"
                      icon={Users2}
                      accent="sky"
                      rows={signupClientRows}
                      footer="Ativação preferencialmente automática após confirmação de e-mail e aceite explícito de políticas."
                    />
                    <ProfilePanel
                      title="Fornecedor"
                      icon={Building2}
                      accent="amber"
                      rows={signupVendorRows}
                      footer="Fluxo condicionado à análise documental, aprovação operacional e eventual validação de CNPJ em fonte externa."
                    />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
                    <CalloutCard
                      icon={KeyRound}
                      title="Regras de senha e e-mail"
                      items={[
                        'Senha com mínimo de 10 caracteres, combinação de classes e bloqueio de senhas expostas em bases conhecidas.',
                        'E-mail validado em formato, domínio e unicidade antes da criação definitiva da conta.',
                        'Confirmar senha apenas no frontend; no backend persistir somente após todas as validações críticas.',
                      ]}
                    />

                    <CalloutCard
                      icon={BadgeCheck}
                      title="Validações documentais"
                      items={[
                        'CPF e CNPJ com máscara, normalização, algoritmo verificador e rejeição de padrões inválidos.',
                        'Unicidade por documento e e-mail em toda a base, mesmo entre contas inativas ou em aprovação.',
                        'Fornecedor pode exigir anexos e aceite de termos comerciais antes de obter acesso pleno.',
                      ]}
                    />
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-slate-50/85 p-5 dark:border-slate-800 dark:bg-slate-950/70">
                    <SectionKicker icon={ArrowRight} title="Fluxos esperados por perfil" />
                    <div className="mt-5 grid gap-4 lg:grid-cols-3">
                      <FlowCard
                        step="Seleção do perfil"
                        text="A primeira decisão da tela deve separar Cliente e Fornecedor, alterando microcopy, campos e expectativas do processo."
                      />
                      <FlowCard
                        step="Validação e submissão"
                        text="O formulário valida documento, e-mail, senha e aceite de termos antes do envio ao serviço de identidade."
                      />
                      <FlowCard
                        step="Pós-cadastro"
                        text="Cliente segue para confirmação de e-mail; fornecedor entra em estado Pendente com SLA de análise definido."
                      />
                    </div>
                  </div>
                </div>
              </AuthSpecSection>

              <AuthSpecSection
                id="recovery"
                title="Recuperação de Senha"
                eyebrow="Fluxo 03"
                icon={KeyRound}
                expanded={expandedSections.recovery}
                onToggle={() => toggleSection('recovery')}
                summary="A redefinição de senha deve ser segura, silenciosa em relação à existência da conta e suficientemente orientada para reduzir tickets de suporte. O fluxo precisa combinar comunicação por e-mail, expiração curta de token e revogação de sessões vigentes."
                badges={[
                  <AuthSpecBadge key="b1" variant="danger">Proteção contra abuso</AuthSpecBadge>,
                  <AuthSpecBadge key="b2" variant="info">E-mail transacional</AuthSpecBadge>,
                  <AuthSpecBadge key="b3" variant="success">Baixo atrito</AuthSpecBadge>,
                ]}
              >
                <div className="space-y-8">
                  <SpecMatrix title="Requisitos funcionais do reset" rows={recoveryRows} />

                  <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
                    <CalloutCard
                      icon={Clock3}
                      title="Fluxo operacional"
                      items={[
                        'Usuário informa o e-mail e recebe resposta neutra imediatamente.',
                        'Backoffice gera token assinado, registra evento e aciona envio assíncrono do e-mail.',
                        'Página de redefinição valida token, força nova senha e encerra sessões anteriores.',
                      ]}
                    />
                    <CalloutCard
                      icon={FileLock2}
                      title="Mensagens de erro"
                      items={[
                        'Token expirado: orientar nova solicitação sem revelar detalhes internos.',
                        'Token inválido ou reutilizado: bloquear ação e gerar evento de segurança.',
                        'Senha não aderente à política: explicar critérios de forma objetiva antes do reenvio.',
                      ]}
                    />
                  </div>
                </div>
              </AuthSpecSection>

              <AuthSpecSection
                id="non-functional"
                title="Requisitos Não Funcionais"
                eyebrow="Camada transversal"
                icon={ShieldCheck}
                expanded={expandedSections['non-functional']}
                onToggle={() => toggleSection('non-functional')}
                summary="Os requisitos não funcionais consolidam o padrão enterprise esperado para um sistema de autenticação exposto a alto volume, variação de dispositivos e riscos de fraude. Eles devem orientar arquitetura, observabilidade e governança de dados."
                badges={[
                  <AuthSpecBadge key="b1" variant="danger">Obrigatório para go-live</AuthSpecBadge>,
                  <AuthSpecBadge key="b2" variant="info">Observabilidade ativa</AuthSpecBadge>,
                ]}
              >
                <div className="grid gap-4 xl:grid-cols-2">
                  {nfrRows.map((row) => (
                    <div key={row.id} className="rounded-[26px] border border-slate-200 bg-slate-50/90 p-5 dark:border-slate-800 dark:bg-slate-950/70">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          {row.id}
                        </p>
                        <AuthSpecBadge variant="neutral">{row.metric}</AuthSpecBadge>
                      </div>
                      <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
                        {row.title}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                        {row.description}
                      </p>
                    </div>
                  ))}
                </div>
              </AuthSpecSection>

              <section id="timeline" className="scroll-mt-24 rounded-[30px] border border-slate-200/80 bg-white/88 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/76 dark:shadow-[0_28px_80px_rgba(2,6,23,0.45)] sm:p-8">
                <SectionKicker icon={UserCog} title="Timeline do fluxo de autenticação" />
                <div className="mt-6 grid gap-4 xl:grid-cols-4">
                  {timelineSteps.map((step, index) => {
                    const Icon = step.icon;

                    return (
                      <div key={step.title} className="relative rounded-[26px] border border-slate-200 bg-slate-50/90 p-5 dark:border-slate-800 dark:bg-slate-950/70">
                        {index < timelineSteps.length - 1 ? (
                          <div className="absolute right-[-18px] top-1/2 hidden h-px w-9 -translate-y-1/2 bg-gradient-to-r from-slate-300 to-transparent dark:from-slate-700 xl:block" />
                        ) : null}
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                          <Icon size={20} />
                        </div>
                        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          Etapa {index + 1}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
                          {step.title}
                        </h3>
                        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                          {step.detail}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function MetaCard({ label, value, detail }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/70">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {detail}
      </p>
    </div>
  );
}

function SectionKicker({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100">
        <Icon size={20} />
      </span>
      <h2 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
        {title}
      </h2>
    </div>
  );
}

function NarrativeCard({ title, text, icon: Icon }) {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-slate-50/90 p-5 dark:border-slate-800 dark:bg-slate-950/70">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
        <Icon size={20} />
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
        {text}
      </p>
    </div>
  );
}

function CriticalityRow({ label, detail, variant }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{label}</h3>
        <AuthSpecBadge variant={variant}>{variant}</AuthSpecBadge>
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{detail}</p>
    </div>
  );
}

function SpecMatrix({ title, rows }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-slate-50/85 p-5 dark:border-slate-800 dark:bg-slate-950/70">
      <h3 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h3>
      <div className="mt-5 space-y-4">
        {rows.map((row) => (
          <div key={row.id} className="rounded-[22px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex flex-wrap items-center gap-2">
              <AuthSpecBadge variant="neutral">{row.id}</AuthSpecBadge>
              {row.tags?.map((tag) => (
                <AuthSpecBadge key={tag} variant="info">{tag}</AuthSpecBadge>
              ))}
            </div>
            <h4 className="mt-4 text-base font-semibold text-slate-950 dark:text-white">{row.title}</h4>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{row.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalloutCard({ icon: Icon, title, items }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-slate-50/85 p-5 dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <Icon size={20} />
        </span>
        <h3 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h3>
      </div>
      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-3 rounded-[20px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
            <CheckCircle2 size={18} className="mt-1 shrink-0 text-emerald-500" />
            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfilePanel({ title, icon: Icon, rows, footer, accent }) {
  const accentClasses = accent === 'amber'
    ? 'from-amber-500/15 to-transparent dark:from-amber-500/12'
    : 'from-sky-500/15 to-transparent dark:from-sky-500/12';

  return (
    <div className={`overflow-hidden rounded-[30px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/70`}>
      <div className={`bg-gradient-to-br ${accentClasses} p-6`}>
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
          <Icon size={21} />
        </div>
        <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h3>
        <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
          Requisitos específicos do perfil e diferenças de jornada.
        </p>
      </div>

      <div className="space-y-4 p-6">
        {rows.map((row) => (
          <div key={row.id} className="rounded-[22px] border border-slate-200 bg-slate-50/90 p-5 dark:border-slate-800 dark:bg-slate-900/75">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{row.id}</p>
            <h4 className="mt-3 text-base font-semibold text-slate-950 dark:text-white">{row.title}</h4>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{row.description}</p>
          </div>
        ))}

        <div className="rounded-[22px] border border-dashed border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">{footer}</p>
        </div>
      </div>
    </div>
  );
}

function FlowCard({ step, text }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/80">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{step}</p>
      <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{text}</p>
    </div>
  );
}
