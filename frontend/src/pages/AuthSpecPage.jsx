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
  { id: 'overview', label: 'Visao Geral', code: '00' },
  { id: 'login', label: 'Tela de Login', code: '01' },
  { id: 'signup', label: 'Auto Cadastro', code: '02' },
  { id: 'recovery', label: 'Recuperacao de Senha', code: '03' },
  { id: 'non-functional', label: 'Requisitos Nao Funcionais', code: '04' },
  { id: 'timeline', label: 'Timeline', code: '05' },
];

const overviewMetrics = [
  { label: 'Perfis de acesso', value: '2', detail: 'Clientes e fornecedores com regras e aprovacoes diferentes.' },
  { label: 'Fluxos cobertos', value: '3', detail: 'Login, auto cadastro e recuperacao de senha.' },
  { label: 'Itens criticos', value: '12', detail: 'Validacoes, seguranca, sessao, logs e trilha de auditoria.' },
  { label: 'Status do artefato', value: 'Validacao', detail: 'Pronto para discovery tecnico, alinhamento funcional e refinamento.' },
];

const scopeRows = [
  { title: 'Em escopo', text: 'Jornada de autenticacao web, cadastro por perfil, reset de senha, controles de sessao e regras de aprovacao para fornecedores.' },
  { title: 'Fora de escopo', text: 'SSO corporativo, login social, MFA obrigatorio para todos os usuarios e IAM avancado para backoffice.' },
  { title: 'Premissas', text: 'Existe servico de identidade, envio de e-mail transacional, base unica de usuarios e times internos aptos a aprovar fornecedores.' },
  { title: 'Dependencias', text: 'Servico de e-mail, validacao documental, modulo de consentimento e camada centralizada de logs e auditoria.' },
];

const deliveryRows = [
  { title: 'Obrigatorio no MVP', status: 'MVP', text: 'Login seguro, validacao de e-mail e documento, reset de senha, aprovacao de fornecedor e trilha de eventos.' },
  { title: 'Obrigatorio para go-live', status: 'Go-live', text: 'Bloqueio progressivo, revogacao de sessoes, cooldown de reenvio, monitoramento e mascaramento de dados.' },
  { title: 'Pos MVP', status: 'Evolucao', text: 'MFA adaptativo, score por dispositivo, regras por tenant e federacao corporativa.' },
];

const loginFieldRows = [
  { id: 'FR-LOG-01', title: 'Identificacao por e-mail', description: 'A tela deve exigir e-mail valido como credencial primaria para clientes e fornecedores.', tags: ['Obrigatorio', 'Formato'] },
  { id: 'FR-LOG-02', title: 'Senha mascarada', description: 'Campo com alternancia de visibilidade, suporte a colagem segura e bloqueio de autocomplete inadequado.', tags: ['UX', 'Seguranca'] },
  { id: 'FR-LOG-03', title: 'Resolucao de perfil', description: 'Apos autenticar, o backend deve identificar o perfil do usuario e direcionar para a area adequada.', tags: ['Backoffice', 'Regra de negocio'] },
];

const loginRuleRows = [
  { id: 'FR-LOG-04', title: 'Controle de tentativas invalidas', description: 'Apos 5 falhas em 15 minutos, a conta deve sofrer bloqueio temporario ou verificacao adicional.', tags: ['Alta criticidade', 'Rate limit'] },
  { id: 'FR-LOG-05', title: 'Sessao autenticada', description: 'Acesso bem-sucedido deve emitir access token curto e refresh token rotativo vinculado ao contexto do dispositivo.', tags: ['Sessao', 'Auditoria'] },
  { id: 'FR-LOG-06', title: 'Fallback operacional', description: 'Em indisponibilidade do servico de identidade, a UI deve exibir orientacao objetiva e registrar incidente.', tags: ['Disponibilidade', 'Suporte'] },
];

const loginFieldMatrix = [
  { field: 'E-mail', type: 'email', format: 'nome@dominio.com', required: 'Sim', validation: 'Formato valido, trim e lowercase', message: 'Informe um e-mail valido.' },
  { field: 'Senha', type: 'password', format: 'Oculto', required: 'Sim', validation: 'Nao vazio e aderente a politica ativa', message: 'Informe sua senha.' },
  { field: 'Lembrar dispositivo', type: 'checkbox', format: 'Booleano', required: 'Nao', validation: 'Opcional para device confiavel', message: 'Opcional.' },
];

const loginActionRows = [
  { action: 'Entrar', behavior: 'Fica habilitado apenas com campos obrigatorios preenchidos.', success: 'Cria sessao, grava auditoria e redireciona para a area correta.', error: 'Exibe mensagem generica sem revelar existencia da conta.' },
  { action: 'Esqueci minha senha', behavior: 'Abre fluxo de reset mantendo o contexto do tenant.', success: 'Redireciona para a solicitacao de redefinicao.', error: 'Se houver indisponibilidade, exibir fallback orientativo.' },
  { action: 'Mostrar senha', behavior: 'Alterna visibilidade sem apagar o valor digitado.', success: 'Mantem cursor e estado do formulario.', error: 'Nao aplicavel.' },
];

const loginAcceptance = [
  'Dado um usuario valido, quando informar credenciais corretas, entao o sistema deve autenticar e redirecionar para a area apropriada.',
  'Dado um usuario com 5 falhas em 15 minutos, quando tentar novamente, entao o sistema deve aplicar bloqueio temporario e registrar o evento.',
  'Dado um fornecedor pendente de aprovacao, quando autenticar com sucesso, entao o sistema deve direcionar para o estado de onboarding pendente.',
];

const signupClientRows = [
  { id: 'FR-CAD-CLI-01', title: 'Dados minimos de cliente', description: 'Nome completo, e-mail, CPF, celular, senha e aceite de termos devem ser obrigatorios.' },
  { id: 'FR-CAD-CLI-02', title: 'Validacao documental', description: 'CPF deve passar por mascara, normalizacao e verificacao algoritmica antes da submissao.' },
  { id: 'FR-CAD-CLI-03', title: 'Ativacao da conta', description: 'Cliente segue para confirmacao de e-mail antes de obter acesso completo.' },
];

const signupVendorRows = [
  { id: 'FR-CAD-FOR-01', title: 'Dados corporativos obrigatorios', description: 'Razao social, nome fantasia, CNPJ, e-mail corporativo, telefone, responsavel legal e senha.' },
  { id: 'FR-CAD-FOR-02', title: 'Onboarding com compliance', description: 'Fornecedor entra como Pendente ate concluir verificacoes e aprovacao operacional.' },
  { id: 'FR-CAD-FOR-03', title: 'Conta principal', description: 'O primeiro usuario cadastrado assume o papel de administrador do fornecedor.' },
];

const signupFieldMatrixClient = [
  { field: 'Nome completo', type: 'text', format: '2 a 120 caracteres', required: 'Sim', validation: 'Sem apenas espacos e sem lixo de digitacao', message: 'Informe seu nome completo.' },
  { field: 'E-mail', type: 'email', format: 'nome@dominio.com', required: 'Sim', validation: 'Formato, dominio e unicidade', message: 'Ja existe conta para este e-mail.' },
  { field: 'CPF', type: 'text', format: '000.000.000-00', required: 'Sim', validation: 'Mascara, DV e unicidade', message: 'CPF invalido ou ja cadastrado.' },
  { field: 'Celular', type: 'tel', format: '(00) 00000-0000', required: 'Sim', validation: 'Numero valido para contato e confirmacao', message: 'Informe um celular valido.' },
  { field: 'Senha', type: 'password', format: 'Minimo de 10 caracteres', required: 'Sim', validation: 'Complexidade, blacklist e politica vigente', message: 'Senha fora da politica.' },
  { field: 'Aceite de termos', type: 'checkbox', format: 'Booleano', required: 'Sim', validation: 'Obrigatorio antes do submit', message: 'Voce precisa aceitar os termos.' },
];

const signupFieldMatrixVendor = [
  { field: 'Razao social', type: 'text', format: '3 a 150 caracteres', required: 'Sim', validation: 'Sem caracteres invalidos', message: 'Informe a razao social.' },
  { field: 'Nome fantasia', type: 'text', format: '3 a 150 caracteres', required: 'Sim', validation: 'Obrigatorio para exibicao comercial', message: 'Informe o nome fantasia.' },
  { field: 'CNPJ', type: 'text', format: '00.000.000/0000-00', required: 'Sim', validation: 'Mascara, DV e unicidade global', message: 'CNPJ invalido ou ja cadastrado.' },
  { field: 'E-mail corporativo', type: 'email', format: 'nome@empresa.com', required: 'Sim', validation: 'Formato, dominio e unicidade', message: 'Use um e-mail corporativo valido.' },
  { field: 'Responsavel legal', type: 'text', format: '2 a 120 caracteres', required: 'Sim', validation: 'Obrigatorio para aprovacao', message: 'Informe o responsavel legal.' },
  { field: 'Senha', type: 'password', format: 'Minimo de 10 caracteres', required: 'Sim', validation: 'Complexidade, blacklist e politica vigente', message: 'Senha fora da politica.' },
];

const signupActionRows = [
  { action: 'Selecionar perfil', behavior: 'Alterna a experiencia entre Cliente e Fornecedor e reseta campos exclusivos.', success: 'Exibe copy, campos e regras corretos.', error: 'Nao aplicavel.' },
  { action: 'Criar conta', behavior: 'Dispara validacao completa antes do submit.', success: 'Cliente vai para confirmacao de e-mail; fornecedor vai para aprovacao.', error: 'Exibe erros por campo e resumo de bloqueios.' },
  { action: 'Reenviar confirmacao', behavior: 'Disponivel para contas pendentes.', success: 'Novo e-mail emitido com limite de frequencia.', error: 'Exibir cooldown e mensagem neutra.' },
];

const signupAcceptance = [
  'Dado um cliente com dados validos, quando concluir o formulario, entao a conta deve ser criada em status Aguardando confirmacao de e-mail.',
  'Dado um fornecedor com CNPJ duplicado, quando tentar concluir, entao o sistema deve bloquear a criacao e nao gerar conta parcial.',
  'Dado um fornecedor aprovado, quando confirmar o e-mail, entao a conta deve ficar apta para o primeiro login.',
];

const recoveryRows = [
  { id: 'FR-REC-01', title: 'Solicitacao segura', description: 'A interface aceita e-mail sem revelar se a conta existe na base.', tags: ['Privacidade', 'Anti enumeracao'] },
  { id: 'FR-REC-02', title: 'Token de curta duracao', description: 'O link deve expirar em 15 minutos, ser de uso unico e invalidar tokens anteriores.', tags: ['Token', 'Tempo de vida'] },
  { id: 'FR-REC-03', title: 'Revogacao de sessoes', description: 'Ao redefinir a senha, todas as sessoes ativas devem ser encerradas e o usuario notificado.', tags: ['Containment', 'Auditoria'] },
];

const recoveryFieldMatrix = [
  { field: 'E-mail da conta', type: 'email', format: 'nome@dominio.com', required: 'Sim', validation: 'Formato valido e resposta neutra', message: 'Se o e-mail existir, enviaremos instrucoes.' },
  { field: 'Nova senha', type: 'password', format: 'Minimo de 10 caracteres', required: 'Sim', validation: 'Complexidade, confirmacao e blacklist', message: 'Senha fora da politica.' },
  { field: 'Confirmacao da senha', type: 'password', format: 'Igual ao campo anterior', required: 'Sim', validation: 'Match exato', message: 'As senhas nao coincidem.' },
  { field: 'Token de redefinicao', type: 'hidden/url', format: 'JWT ou hash assinado', required: 'Sim', validation: 'Uso unico e expiracao curta', message: 'Link invalido ou expirado.' },
];

const recoveryActionRows = [
  { action: 'Enviar link', behavior: 'Aceita e-mail e sempre retorna resposta neutra.', success: 'Gera token, registra evento e dispara o e-mail.', error: 'Em indisponibilidade, orientar nova tentativa sem detalhar o erro interno.' },
  { action: 'Redefinir senha', behavior: 'Valida token, senha e confirmacao antes de persistir.', success: 'Atualiza credencial, revoga sessoes e retorna ao login.', error: 'Bloqueia token reutilizado e mostra mensagem objetiva.' },
];

const recoveryAcceptance = [
  'Dado um token valido, quando o usuario informar uma nova senha aderente, entao o sistema deve redefinir a senha e encerrar as sessoes ativas.',
  'Dado um token expirado, quando o usuario abrir o link, entao o sistema deve impedir o reset e orientar nova solicitacao.',
  'Dado um e-mail nao cadastrado, quando solicitar recuperacao, entao a interface deve responder com a mesma mensagem usada para contas existentes.',
];

const crossRules = [
  { rule: 'Expiracao de sessao', detail: 'Access token curto e refresh token rotativo com revogacao imediata em logout, reset de senha, bloqueio ou troca de perfil.' },
  { rule: 'Bloqueio progressivo', detail: 'Falhas repetidas elevam o tempo de espera e podem exigir desafio adicional.' },
  { rule: 'Confirmacao de e-mail', detail: 'Cliente pode reenviar confirmacao em janela controlada; fornecedor depende de confirmacao e aprovacao operacional.' },
  { rule: 'Unicidade global', detail: 'E-mail, CPF e CNPJ nao podem coexistir em cadastros ativos, pendentes ou desativados sem fluxo formal de saneamento.' },
];

const timelineSteps = [
  { title: 'Descoberta de contexto', detail: 'Usuario escolhe entrar, criar conta ou redefinir senha a partir da home de autenticacao.', icon: ScanSearch },
  { title: 'Validacao de identidade', detail: 'Backend valida formato, unicidade, status da conta, reputacao da tentativa e bloqueios ativos.', icon: Fingerprint },
  { title: 'Decisao de fluxo', detail: 'A plataforma direciona para sessao ativa, onboarding pendente, confirmacao de e-mail ou reset assistido.', icon: Layers3 },
  { title: 'Persistencia e auditoria', detail: 'Cada transicao relevante grava eventos rastreaveis para seguranca, suporte e analytics.', icon: FileLock2 },
];

const messageCards = [
  { type: 'Sucesso', tone: 'success', text: 'Acesso validado com sucesso. Redirecionando para seu painel.' },
  { type: 'Erro de credenciais', tone: 'danger', text: 'Nao foi possivel validar suas credenciais. Revise os dados e tente novamente.' },
  { type: 'Bloqueio temporario', tone: 'warning', text: 'Detectamos multiplas tentativas invalidas. Aguarde alguns minutos antes de tentar novamente.' },
  { type: 'Acao pendente', tone: 'info', text: 'Seu cadastro foi recebido e esta aguardando validacao complementar ou aprovacao operacional.' },
];

const acceptanceSummary = [
  { flow: 'Login', status: 'MVP', detail: 'Campos obrigatorios, mensagens, controle de falhas, sessao e direcionamento por perfil definidos.' },
  { flow: 'Auto Cadastro', status: 'MVP', detail: 'Separacao entre cliente e fornecedor, unicidade, regras de senha e validacao documental definidas.' },
  { flow: 'Recuperacao de Senha', status: 'MVP', detail: 'Token, expiraracao curta, resposta neutra, revogacao de sessoes e mensagens de erro descritas.' },
  { flow: 'Seguranca e Operacao', status: 'Go-live', detail: 'Logs, auditoria, criptografia, performance, escalabilidade e mascaramento especificados.' },
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
    document.title = 'Auth Experience Spec | Multiatendimento';

    const previousRobots = document.querySelector('meta[name="robots"]');
    const createdRobots = previousRobots || document.createElement('meta');
    createdRobots.setAttribute('name', 'robots');
    createdRobots.setAttribute('content', 'noindex, nofollow, noarchive, nosnippet');

    if (!previousRobots) {
      document.head.appendChild(createdRobots);
    }

    return () => {
      document.title = 'Multiatendimento';
      if (!previousRobots && createdRobots.parentNode) {
        createdRobots.parentNode.removeChild(createdRobots);
      }
    };
  }, []);

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
                      <AuthSpecBadge variant="success">Documento em revisao</AuthSpecBadge>
                      <AuthSpecBadge variant="warning">Link de validacao</AuthSpecBadge>
                    </div>

                    <div className="space-y-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                        Plataforma de compras online
                      </p>
                      <h1 className="max-w-4xl font-[var(--font-display)] text-4xl tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                        Especificacao funcional da autenticacao para clientes e fornecedores.
                      </h1>
                      <p className="max-w-3xl text-base leading-8 text-slate-600 dark:text-slate-300">
                        Este artefato consolida requisitos funcionais, nao funcionais e criterios de aceite para a jornada de acesso de uma plataforma B2C/B2B. O objetivo e equilibrar conversao, seguranca, governanca e operacao.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:w-[360px] xl:grid-cols-1">
                    <MetaCard label="Owner" value="Product + Security" detail="Alinhamento entre experiencia, risco, suporte e compliance." />
                    <MetaCard label="Ultima revisao" value="20 mai 2026" detail="Versao refinada para avaliacao funcional e tecnica." />
                    <MetaCard label="Publicacao" value="Noindex ativo" detail="Pagina mantida acessivel, mas sinalizada para nao indexacao." />
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
                    <SectionKicker icon={ShieldCheck} title="Resumo executivo" />
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <NarrativeCard
                        title="Cliente"
                        icon={Users2}
                        text="Prioriza conversao e baixo atrito, com cadastro rapido, validacao de CPF e recuperacao de senha simples."
                      />
                      <NarrativeCard
                        title="Fornecedor"
                        icon={Building2}
                        text="Exige governanca adicional, validacao de CNPJ, aprovacao operacional e rastreabilidade reforcada."
                      />
                    </div>

                    <div className="mt-6 rounded-[26px] border border-slate-200 bg-slate-50/90 p-5 dark:border-slate-800 dark:bg-slate-950/70">
                      <div className="flex flex-wrap items-center gap-3">
                        <AuthSpecBadge variant="danger">Critico</AuthSpecBadge>
                        <AuthSpecBadge variant="info">LGPD friendly</AuthSpecBadge>
                        <AuthSpecBadge variant="success">Pronto para refinamento</AuthSpecBadge>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
                        O desenho considera protecao contra enumeracao de contas, limitacao de tentativas invalidas, validacao documental de fornecedores e comunicacao transacional consistente em todos os eventos sensiveis.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[30px] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/76 dark:shadow-[0_28px_80px_rgba(2,6,23,0.45)] sm:p-8">
                    <SectionKicker icon={AlertTriangle} title="Mapa de criticidade" />
                    <div className="mt-6 space-y-4">
                      <CriticalityRow label="Credenciais e sessao" variant="danger" detail="Maior exposicao a fraude, takeover de conta e custos de suporte." />
                      <CriticalityRow label="Cadastro de fornecedor" variant="warning" detail="Risco operacional alto sem validacao documental e aprovacao controlada." />
                      <CriticalityRow label="Reset de senha" variant="info" detail="Fluxo sensivel a engenharia social e abuso de token." />
                      <CriticalityRow label="Observabilidade" variant="success" detail="Base para resposta a incidentes, analytics e melhoria continua." />
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <ScopeGrid rows={scopeRows} />
                  <ReleaseGrid rows={deliveryRows} />
                </div>
              </section>

              <AuthSpecSection
                id="login"
                title="Tela de Login"
                eyebrow="Fluxo 01"
                icon={LockKeyhole}
                expanded={expandedSections.login}
                onToggle={() => toggleSection('login')}
                summary="A experiencia de login deve ser objetiva, segura e resiliente a fraude. O sistema autentica clientes e fornecedores com os mesmos campos base, mas aplica regras contextuais de sessao e bloqueio conforme perfil e risco da tentativa."
                badges={[
                  <AuthSpecBadge key="b1" variant="danger">Seguranca critica</AuthSpecBadge>,
                  <AuthSpecBadge key="b2" variant="success">Conversao assistida</AuthSpecBadge>,
                  <AuthSpecBadge key="b3" variant="info">Auditoria obrigatoria</AuthSpecBadge>,
                ]}
              >
                <div className="space-y-8">
                  <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
                    <div className="space-y-6">
                      <SpecMatrix title="Campos obrigatorios e validacoes" rows={loginFieldRows} />
                      <SpecMatrix title="Regras de negocio e autenticacao" rows={loginRuleRows} />
                    </div>

                    <div className="space-y-6">
                      <CalloutCard
                        icon={ShieldCheck}
                        title="Controles de seguranca"
                        items={[
                          'Hash de senha resistente a brute force e politica de rotacao de credenciais comprometidas.',
                          'Rate limit por IP, identidade e device para contencao de abuso automatizado.',
                          'Sessao revogavel, refresh token rotativo e invalidacao automatica apos logout, reset ou bloqueio.',
                        ]}
                      />
                      <CalloutCard
                        icon={MailCheck}
                        title="Mensagens e feedbacks"
                        items={[
                          'Falha generica sem expor existencia da conta.',
                          'Sucesso com redirecionamento contextual para o dashboard do perfil autenticado.',
                          'Conta bloqueada com orientacao de suporte ou fluxo de redefinicao de senha.',
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

                  <div className="grid gap-6 xl:grid-cols-[1.2fr_0.9fr]">
                    <FieldMatrixTable title="Matriz formal de campos da tela de login" rows={loginFieldMatrix} />
                    <ActionBehaviorGrid title="Comportamento esperado dos componentes de acao" rows={loginActionRows} />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[0.95fr_1.15fr]">
                    <RuleListCard title="Politicas transversais de acesso" rows={crossRules} />
                    <AcceptanceChecklist title="Criterios de aceite da tela de login" items={loginAcceptance} />
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
                summary="O auto cadastro precisa separar claramente os dois perfis desde o inicio da jornada, minimizando friccao para clientes e reforcando validacoes corporativas para fornecedores."
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
                      footer="Ativacao preferencialmente automatica apos confirmacao de e-mail e aceite explicito das politicas."
                    />
                    <ProfilePanel
                      title="Fornecedor"
                      icon={Building2}
                      accent="amber"
                      rows={signupVendorRows}
                      footer="Fluxo condicionado a analise documental, aprovacao operacional e eventual validacao externa de CNPJ."
                    />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
                    <CalloutCard
                      icon={KeyRound}
                      title="Regras de senha e e-mail"
                      items={[
                        'Senha com minimo de 10 caracteres, combinacao de classes e bloqueio de senhas expostas em bases conhecidas.',
                        'E-mail validado em formato, dominio e unicidade antes da criacao definitiva da conta.',
                        'Confirmacao de senha apenas na interface; persistencia somente apos validacoes criticas.',
                      ]}
                    />
                    <CalloutCard
                      icon={BadgeCheck}
                      title="Validacoes documentais"
                      items={[
                        'CPF e CNPJ com mascara, normalizacao, digitos verificadores e rejeicao de padroes invalidos.',
                        'Unicidade por documento e e-mail em toda a base, inclusive contas pendentes ou inativas.',
                        'Fornecedor pode exigir anexos e aceite de termos comerciais antes de obter acesso pleno.',
                      ]}
                    />
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-slate-50/85 p-5 dark:border-slate-800 dark:bg-slate-950/70">
                    <SectionKicker icon={ArrowRight} title="Fluxos esperados por perfil" />
                    <div className="mt-5 grid gap-4 lg:grid-cols-3">
                      <FlowCard step="Selecao do perfil" text="A primeira decisao da tela deve separar Cliente e Fornecedor, alterando copy, campos e expectativas do processo." />
                      <FlowCard step="Validacao e submissao" text="O formulario valida documento, e-mail, senha e aceite de termos antes do envio ao servico de identidade." />
                      <FlowCard step="Pos cadastro" text="Cliente segue para confirmacao de e-mail; fornecedor entra em estado Pendente com SLA de analise definido." />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <FieldMatrixTable title="Matriz formal de campos do cadastro de cliente" rows={signupFieldMatrixClient} />
                    <FieldMatrixTable title="Matriz formal de campos do cadastro de fornecedor" rows={signupFieldMatrixVendor} />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                    <ActionBehaviorGrid title="Botoes, estados e mensagens do auto cadastro" rows={signupActionRows} />
                    <AcceptanceChecklist title="Criterios de aceite do auto cadastro" items={signupAcceptance} />
                  </div>
                </div>
              </AuthSpecSection>

              <AuthSpecSection
                id="recovery"
                title="Recuperacao de Senha"
                eyebrow="Fluxo 03"
                icon={KeyRound}
                expanded={expandedSections.recovery}
                onToggle={() => toggleSection('recovery')}
                summary="A redefinicao de senha deve ser segura, silenciosa em relacao a existencia da conta e suficientemente orientada para reduzir tickets de suporte."
                badges={[
                  <AuthSpecBadge key="b1" variant="danger">Protecao contra abuso</AuthSpecBadge>,
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
                        'Usuario informa o e-mail e recebe resposta neutra imediatamente.',
                        'Backoffice gera token assinado, registra evento e aciona envio assincrono do e-mail.',
                        'Pagina de redefinicao valida token, forca nova senha e encerra sessoes anteriores.',
                      ]}
                    />
                    <CalloutCard
                      icon={FileLock2}
                      title="Mensagens de erro"
                      items={[
                        'Token expirado deve orientar nova solicitacao sem revelar detalhes internos.',
                        'Token invalido ou reutilizado deve bloquear a acao e gerar evento de seguranca.',
                        'Senha fora da politica deve explicar criterios de forma objetiva antes do reenvio.',
                      ]}
                    />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1.15fr_0.95fr]">
                    <FieldMatrixTable title="Matriz formal de campos da recuperacao de senha" rows={recoveryFieldMatrix} />
                    <ActionBehaviorGrid title="Comportamento dos componentes de recuperacao" rows={recoveryActionRows} />
                  </div>

                  <AcceptanceChecklist title="Criterios de aceite da recuperacao de senha" items={recoveryAcceptance} />
                </div>
              </AuthSpecSection>

              <AuthSpecSection
                id="non-functional"
                title="Requisitos Nao Funcionais"
                eyebrow="Camada transversal"
                icon={ShieldCheck}
                expanded={expandedSections['non-functional']}
                onToggle={() => toggleSection('non-functional')}
                summary="Os requisitos nao funcionais consolidam o padrao enterprise esperado para um sistema de autenticacao exposto a alto volume, variacao de dispositivos e risco de fraude."
                badges={[
                  <AuthSpecBadge key="b1" variant="danger">Obrigatorio para go-live</AuthSpecBadge>,
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

                <ReleaseChecklist rows={acceptanceSummary} />
              </AuthSpecSection>

              <section id="timeline" className="scroll-mt-24 rounded-[30px] border border-slate-200/80 bg-white/88 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/76 dark:shadow-[0_28px_80px_rgba(2,6,23,0.45)] sm:p-8">
                <SectionKicker icon={UserCog} title="Timeline do fluxo de autenticacao" />
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

function ScopeGrid({ rows }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.title} className="rounded-[26px] border border-slate-200 bg-white/88 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900/72">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{row.title}</p>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{row.text}</p>
        </div>
      ))}
    </div>
  );
}

function ReleaseGrid({ rows }) {
  return (
    <div className="space-y-4 rounded-[30px] border border-slate-200/80 bg-white/88 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900/76">
      <SectionKicker icon={BadgeCheck} title="Recorte de entrega" />
      {rows.map((row) => (
        <div key={row.title} className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex flex-wrap items-center gap-3">
            <AuthSpecBadge variant="neutral">{row.status}</AuthSpecBadge>
            <p className="text-sm font-semibold text-slate-950 dark:text-white">{row.title}</p>
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{row.text}</p>
        </div>
      ))}
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

function FieldMatrixTable({ title, rows }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50/85 dark:border-slate-800 dark:bg-slate-950/70">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <h3 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/80 dark:bg-slate-900/80">
            <tr className="text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3 font-semibold">Campo</th>
              <th className="px-4 py-3 font-semibold">Tipo</th>
              <th className="px-4 py-3 font-semibold">Formato</th>
              <th className="px-4 py-3 font-semibold">Obrig.</th>
              <th className="px-4 py-3 font-semibold">Validacao</th>
              <th className="px-4 py-3 font-semibold">Mensagem</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.field} className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70">
                <td className="px-4 py-4 font-medium text-slate-950 dark:text-white">{row.field}</td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{row.type}</td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{row.format}</td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{row.required}</td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{row.validation}</td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{row.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActionBehaviorGrid({ title, rows }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-slate-50/85 p-5 dark:border-slate-800 dark:bg-slate-950/70">
      <h3 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h3>
      <div className="mt-5 space-y-4">
        {rows.map((row) => (
          <div key={row.action} className="rounded-[22px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex flex-wrap items-center gap-2">
              <AuthSpecBadge variant="neutral">{row.action}</AuthSpecBadge>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              <p><span className="font-semibold text-slate-900 dark:text-white">Estado esperado:</span> {row.behavior}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Sucesso:</span> {row.success}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Erro:</span> {row.error}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AcceptanceChecklist({ title, items }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-slate-50/85 p-5 dark:border-slate-800 dark:bg-slate-950/70">
      <h3 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h3>
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

function RuleListCard({ title, rows }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-slate-50/85 p-5 dark:border-slate-800 dark:bg-slate-950/70">
      <h3 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h3>
      <div className="mt-5 space-y-4">
        {rows.map((row) => (
          <div key={row.rule} className="rounded-[22px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/80">
            <p className="text-sm font-semibold text-slate-950 dark:text-white">{row.rule}</p>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{row.detail}</p>
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
    <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/70">
      <div className={`bg-gradient-to-br ${accentClasses} p-6`}>
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
          <Icon size={21} />
        </div>
        <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h3>
        <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
          Regras especificas do perfil e diferencas de jornada.
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

function ReleaseChecklist({ rows }) {
  return (
    <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50/85 p-5 dark:border-slate-800 dark:bg-slate-950/70">
      <h3 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">Consolidacao de aceite e prontidao</h3>
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {rows.map((row) => (
          <div key={row.flow} className="rounded-[22px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex flex-wrap items-center gap-2">
              <AuthSpecBadge variant="neutral">{row.status}</AuthSpecBadge>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">{row.flow}</p>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{row.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
