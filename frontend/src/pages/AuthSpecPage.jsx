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
  { id: 'timeline', label: 'Timeline', code: '05' },
];

const overviewMetrics = [
  { label: 'Perfis de acesso', value: '2', detail: 'Clientes e fornecedores com regras e aprovações diferentes.' },
  { label: 'Fluxos cobertos', value: '3', detail: 'Login, auto cadastro e recuperação de senha.' },
  { label: 'Itens críticos', value: '12', detail: 'Validações, segurança, sessão, logs e trilha de auditoria.' },
  { label: 'Status do artefato', value: 'Validação', detail: 'Pronto para discovery técnico, alinhamento funcional e refinamento.' },
];

const executiveHighlights = [
  { title: 'Objetivo', text: 'Definir a base funcional e operacional da autenticação para uma plataforma de compras com dois perfis de acesso.' },
  { title: 'Risco principal', text: 'Fraude, takeover de conta e aprovação indevida de fornecedores sem trilha robusta de validação.' },
  { title: 'Decisão de desenho', text: 'Separar conversão de cliente e governança de fornecedor sem fragmentar a experiência da plataforma.' },
];

const scopeRows = [
  { title: 'Em escopo', text: 'Jornada de autenticação web, cadastro por perfil, reset de senha, controles de sessão e regras de aprovação para fornecedores.' },
  { title: 'Fora de escopo', text: 'SSO corporativo, login social, MFA obrigatório para todos os usuários e IAM avançado para backoffice.' },
  { title: 'Premissas', text: 'Existe serviço de identidade, envio de e-mail transacional, base única de usuários e times internos aptos a aprovar fornecedores.' },
  { title: 'Dependências', text: 'Serviço de e-mail, validação documental, módulo de consentimento e camada centralizada de logs e auditoria.' },
];

const deliveryRows = [
  { title: 'Obrigatório no MVP', status: 'MVP', text: 'Login seguro, validação de e-mail e documento, reset de senha, aprovação de fornecedor e trilha de eventos.' },
  { title: 'Obrigatório para go-live', status: 'Go-live', text: 'Bloqueio progressivo, revogação de sessões, cooldown de reenvio, monitoramento e mascaramento de dados.' },
  { title: 'Pós MVP', status: 'Evolução', text: 'MFA adaptativo, score por dispositivo, regras por tenant e federação corporativa.' },
];

const loginFieldRows = [
  { id: 'FR-LOG-01', title: 'Identificação por e-mail', description: 'A tela deve exigir e-mail válido como credencial primária para clientes e fornecedores.', tags: ['Obrigatório', 'Formato'] },
  { id: 'FR-LOG-02', title: 'Senha mascarada', description: 'Campo com alternância de visibilidade, suporte à colagem segura e bloqueio de autocomplete inadequado.', tags: ['UX', 'Segurança'] },
  { id: 'FR-LOG-03', title: 'Resolução de perfil', description: 'Após autenticar, o backend deve identificar o perfil do usuário e direcionar para a área adequada.', tags: ['Backoffice', 'Regra de negócio'] },
];

const loginRuleRows = [
  { id: 'FR-LOG-04', title: 'Controle de tentativas inválidas', description: 'Após 5 falhas em 15 minutos, a conta deve sofrer bloqueio temporário ou verificação adicional.', tags: ['Alta criticidade', 'Rate limit'] },
  { id: 'FR-LOG-05', title: 'Sessão autenticada', description: 'Acesso bem-sucedido deve emitir access token curto e refresh token rotativo vinculado ao contexto do dispositivo.', tags: ['Sessão', 'Auditoria'] },
  { id: 'FR-LOG-06', title: 'Fallback operacional', description: 'Em indisponibilidade do serviço de identidade, a UI deve exibir orientação objetiva e registrar incidente.', tags: ['Disponibilidade', 'Suporte'] },
];

const loginFieldMatrix = [
  { field: 'E-mail', type: 'email', format: 'nome@dominio.com', required: 'Sim', validation: 'Formato válido, trim e lowercase', message: 'Informe um e-mail válido.' },
  { field: 'Senha', type: 'password', format: 'Oculto', required: 'Sim', validation: 'Não vazio e aderente à política ativa', message: 'Informe sua senha.' },
  { field: 'Lembrar dispositivo', type: 'checkbox', format: 'Booleano', required: 'Não', validation: 'Opcional para device confiável', message: 'Opcional.' },
];

const loginActionRows = [
  { action: 'Entrar', behavior: 'Fica habilitado apenas com campos obrigatórios preenchidos.', success: 'Cria sessão, grava auditoria e redireciona para a área correta.', error: 'Exibe mensagem genérica sem revelar existência da conta.' },
  { action: 'Esqueci minha senha', behavior: 'Abre fluxo de reset mantendo o contexto do tenant.', success: 'Redireciona para a solicitação de redefinição.', error: 'Se houver indisponibilidade, exibir fallback orientativo.' },
  { action: 'Mostrar senha', behavior: 'Alterna visibilidade sem apagar o valor digitado.', success: 'Mantém cursor e estado do formulário.', error: 'Não aplicável.' },
];

const loginAcceptance = [
  'Dado um usuário válido, quando informar credenciais corretas, então o sistema deve autenticar e redirecionar para a área apropriada.',
  'Dado um usuário com 5 falhas em 15 minutos, quando tentar novamente, então o sistema deve aplicar bloqueio temporário e registrar o evento.',
  'Dado um fornecedor pendente de aprovação, quando autenticar com sucesso, então o sistema deve direcionar para o estado de onboarding pendente.',
];

const signupClientRows = [
  { id: 'FR-CAD-CLI-01', title: 'Dados mínimos de cliente', description: 'Nome completo, e-mail, CPF, celular, senha e aceite de termos devem ser obrigatórios.' },
  { id: 'FR-CAD-CLI-02', title: 'Validação documental', description: 'CPF deve passar por máscara, normalização e verificação algorítmica antes da submissão.' },
  { id: 'FR-CAD-CLI-03', title: 'Ativação da conta', description: 'Cliente segue para confirmação de e-mail antes de obter acesso completo.' },
];

const signupVendorRows = [
  { id: 'FR-CAD-FOR-01', title: 'Dados corporativos obrigatórios', description: 'Razão social, nome fantasia, CNPJ, e-mail corporativo, telefone, responsável legal e senha.' },
  { id: 'FR-CAD-FOR-02', title: 'Onboarding com compliance', description: 'Fornecedor entra como Pendente até concluir verificações e aprovação operacional.' },
  { id: 'FR-CAD-FOR-03', title: 'Conta principal', description: 'O primeiro usuário cadastrado assume o papel de administrador do fornecedor.' },
];

const signupFieldMatrixClient = [
  { field: 'Nome completo', type: 'text', format: '2 a 120 caracteres', required: 'Sim', validation: 'Sem apenas espaços e sem lixo de digitação', message: 'Informe seu nome completo.' },
  { field: 'E-mail', type: 'email', format: 'nome@dominio.com', required: 'Sim', validation: 'Formato, domínio e unicidade', message: 'Já existe conta para este e-mail.' },
  { field: 'CPF', type: 'text', format: '000.000.000-00', required: 'Sim', validation: 'Máscara, DV e unicidade', message: 'CPF inválido ou já cadastrado.' },
  { field: 'Celular', type: 'tel', format: '(00) 00000-0000', required: 'Sim', validation: 'Número válido para contato e confirmação', message: 'Informe um celular válido.' },
  { field: 'Senha', type: 'password', format: 'Mínimo de 10 caracteres', required: 'Sim', validation: 'Complexidade, blacklist e política vigente', message: 'Senha fora da política.' },
  { field: 'Aceite de termos', type: 'checkbox', format: 'Booleano', required: 'Sim', validation: 'Obrigatório antes do submit', message: 'Você precisa aceitar os termos.' },
];

const signupFieldMatrixVendor = [
  { field: 'Razão social', type: 'text', format: '3 a 150 caracteres', required: 'Sim', validation: 'Sem caracteres inválidos', message: 'Informe a razão social.' },
  { field: 'Nome fantasia', type: 'text', format: '3 a 150 caracteres', required: 'Sim', validation: 'Obrigatório para exibição comercial', message: 'Informe o nome fantasia.' },
  { field: 'CNPJ', type: 'text', format: '00.000.000/0000-00', required: 'Sim', validation: 'Máscara, DV e unicidade global', message: 'CNPJ inválido ou já cadastrado.' },
  { field: 'E-mail corporativo', type: 'email', format: 'nome@empresa.com', required: 'Sim', validation: 'Formato, domínio e unicidade', message: 'Use um e-mail corporativo válido.' },
  { field: 'Responsável legal', type: 'text', format: '2 a 120 caracteres', required: 'Sim', validation: 'Obrigatório para aprovação', message: 'Informe o responsável legal.' },
  { field: 'Senha', type: 'password', format: 'Mínimo de 10 caracteres', required: 'Sim', validation: 'Complexidade, blacklist e política vigente', message: 'Senha fora da política.' },
];

const signupActionRows = [
  { action: 'Selecionar perfil', behavior: 'Alterna a experiência entre Cliente e Fornecedor e reseta campos exclusivos.', success: 'Exibe copy, campos e regras corretos.', error: 'Não aplicável.' },
  { action: 'Criar conta', behavior: 'Dispara validação completa antes do submit.', success: 'Cliente vai para confirmação de e-mail; fornecedor vai para aprovação.', error: 'Exibe erros por campo e resumo de bloqueios.' },
  { action: 'Reenviar confirmação', behavior: 'Disponível para contas pendentes.', success: 'Novo e-mail emitido com limite de frequência.', error: 'Exibir cooldown e mensagem neutra.' },
];

const signupAcceptance = [
  'Dado um cliente com dados válidos, quando concluir o formulário, então a conta deve ser criada em status Aguardando confirmação de e-mail.',
  'Dado um fornecedor com CNPJ duplicado, quando tentar concluir, então o sistema deve bloquear a criação e não gerar conta parcial.',
  'Dado um fornecedor aprovado, quando confirmar o e-mail, então a conta deve ficar apta para o primeiro login.',
];

const recoveryRows = [
  { id: 'FR-REC-01', title: 'Solicitação segura', description: 'A interface aceita e-mail sem revelar se a conta existe na base.', tags: ['Privacidade', 'Anti enumeração'] },
  { id: 'FR-REC-02', title: 'Token de curta duração', description: 'O link deve expirar em 15 minutos, ser de uso único e invalidar tokens anteriores.', tags: ['Token', 'Tempo de vida'] },
  { id: 'FR-REC-03', title: 'Revogação de sessões', description: 'Ao redefinir a senha, todas as sessões ativas devem ser encerradas e o usuário notificado.', tags: ['Containment', 'Auditoria'] },
];

const recoveryFieldMatrix = [
  { field: 'E-mail da conta', type: 'email', format: 'nome@dominio.com', required: 'Sim', validation: 'Formato válido e resposta neutra', message: 'Se o e-mail existir, enviaremos instruções.' },
  { field: 'Nova senha', type: 'password', format: 'Mínimo de 10 caracteres', required: 'Sim', validation: 'Complexidade, confirmação e blacklist', message: 'Senha fora da política.' },
  { field: 'Confirmação da senha', type: 'password', format: 'Igual ao campo anterior', required: 'Sim', validation: 'Match exato', message: 'As senhas não coincidem.' },
  { field: 'Token de redefinição', type: 'hidden/url', format: 'JWT ou hash assinado', required: 'Sim', validation: 'Uso único e expiração curta', message: 'Link inválido ou expirado.' },
];

const recoveryActionRows = [
  { action: 'Enviar link', behavior: 'Aceita e-mail e sempre retorna resposta neutra.', success: 'Gera token, registra evento e dispara o e-mail.', error: 'Em indisponibilidade, orientar nova tentativa sem detalhar o erro interno.' },
  { action: 'Redefinir senha', behavior: 'Valida token, senha e confirmação antes de persistir.', success: 'Atualiza credencial, revoga sessões e retorna ao login.', error: 'Bloqueia token reutilizado e mostra mensagem objetiva.' },
];

const recoveryAcceptance = [
  'Dado um token válido, quando o usuário informar uma nova senha aderente, então o sistema deve redefinir a senha e encerrar as sessões ativas.',
  'Dado um token expirado, quando o usuário abrir o link, então o sistema deve impedir o reset e orientar nova solicitação.',
  'Dado um e-mail não cadastrado, quando solicitar recuperação, então a interface deve responder com a mesma mensagem usada para contas existentes.',
];

const nfrRows = [
  {
    id: 'NFR-SEC-01',
    title: 'Segurança e criptografia',
    description: 'Senhas armazenadas com hash resistente a força bruta, tráfego exclusivamente em TLS 1.2+ e segredos segregados por ambiente.',
    metric: 'Zero armazenamento reversível',
  },
  {
    id: 'NFR-PER-01',
    title: 'Performance percebida',
    description: 'Tempo de resposta da autenticação inferior a 2 segundos no percentil 95, desconsiderando indisponibilidade de terceiros.',
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

const crossRules = [
  { rule: 'Expiração de sessão', detail: 'Access token curto e refresh token rotativo com revogação imediata em logout, reset de senha, bloqueio ou troca de perfil.' },
  { rule: 'Bloqueio progressivo', detail: 'Falhas repetidas elevam o tempo de espera e podem exigir desafio adicional.' },
  { rule: 'Confirmação de e-mail', detail: 'Cliente pode reenviar confirmação em janela controlada; fornecedor depende de confirmação e aprovação operacional.' },
  { rule: 'Unicidade global', detail: 'E-mail, CPF e CNPJ não podem coexistir em cadastros ativos, pendentes ou desativados sem fluxo formal de saneamento.' },
];

const timelineSteps = [
  { title: 'Descoberta de contexto', detail: 'Usuário escolhe entrar, criar conta ou redefinir senha a partir da home de autenticação.', icon: ScanSearch },
  { title: 'Validação de identidade', detail: 'Backend valida formato, unicidade, status da conta, reputação da tentativa e bloqueios ativos.', icon: Fingerprint },
  { title: 'Decisão de fluxo', detail: 'A plataforma direciona para sessão ativa, onboarding pendente, confirmação de e-mail ou reset assistido.', icon: Layers3 },
  { title: 'Persistência e auditoria', detail: 'Cada transição relevante grava eventos rastreáveis para segurança, suporte e analytics.', icon: FileLock2 },
];

const messageCards = [
  { type: 'Sucesso', tone: 'success', text: 'Acesso validado com sucesso. Redirecionando para seu painel.' },
  { type: 'Erro de credenciais', tone: 'danger', text: 'Não foi possível validar suas credenciais. Revise os dados e tente novamente.' },
  { type: 'Bloqueio temporário', tone: 'warning', text: 'Detectamos múltiplas tentativas inválidas. Aguarde alguns minutos antes de tentar novamente.' },
  { type: 'Ação pendente', tone: 'info', text: 'Seu cadastro foi recebido e está aguardando validação complementar ou aprovação operacional.' },
];

const acceptanceSummary = [
  { flow: 'Login', status: 'MVP', detail: 'Campos obrigatórios, mensagens, controle de falhas, sessão e direcionamento por perfil definidos.' },
  { flow: 'Auto Cadastro', status: 'MVP', detail: 'Separação entre cliente e fornecedor, unicidade, regras de senha e validação documental definidas.' },
  { flow: 'Recuperação de Senha', status: 'MVP', detail: 'Token, expiração curta, resposta neutra, revogação de sessões e mensagens de erro descritas.' },
  { flow: 'Segurança e Operação', status: 'Go-live', detail: 'Logs, auditoria, criptografia, performance, escalabilidade e mascaramento especificados.' },
];

const demoCredentials = {
  client: {
    email: 'cliente@codenapp.com',
    password: 'Cliente@123',
    destination: 'Área do cliente',
  },
  vendor: {
    email: 'fornecedor@codenapp.com',
    password: 'Fornecedor@123',
    destination: 'Painel do fornecedor',
  },
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cpfPattern = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
const cnpjPattern = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
const phonePattern = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
const publicMailDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com'];
const demoStorageKey = 'auth-spec-demo-accounts-v1';

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
    document.body.classList.add('auth-spec-page');

    const previousRobots = document.querySelector('meta[name="robots"]');
    const createdRobots = previousRobots || document.createElement('meta');
    createdRobots.setAttribute('name', 'robots');
    createdRobots.setAttribute('content', 'noindex, nofollow, noarchive, nosnippet');

    if (!previousRobots) {
      document.head.appendChild(createdRobots);
    }

    return () => {
      document.title = 'Multiatendimento';
      document.body.classList.remove('auth-spec-page');
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
    <div className={theme === 'dark' ? 'dark auth-spec-page' : 'auth-spec-page'}>
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
                      <AuthSpecBadge variant="success">Spec executivo</AuthSpecBadge>
                      <AuthSpecBadge variant="warning">Validação controlada</AuthSpecBadge>
                    </div>

                    <div className="space-y-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                        Plataforma de compras online
                      </p>
                      <h1 className="max-w-4xl font-[var(--font-display)] text-4xl tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                        Especificação funcional da autenticação para clientes e fornecedores.
                      </h1>
                      <p className="max-w-3xl text-base leading-8 text-slate-600 dark:text-slate-300">
                        Este artefato consolida requisitos funcionais, não funcionais e critérios de aceite para a jornada de acesso de uma plataforma B2C/B2B. O objetivo é equilibrar conversão, segurança, governança e operação.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:w-[360px] xl:grid-cols-1">
                    <MetaCard label="Owner" value="Product + Security" detail="Alinhamento entre experiência, risco, suporte e compliance." />
                    <MetaCard label="Última revisão" value="20 mai 2026" detail="Versão refinada para avaliação funcional e técnica." />
                    <MetaCard label="Publicação" value="Noindex ativo" detail="Página mantida acessível, mas sinalizada para não indexação." />
                  </div>
                </div>

                <div className="mt-6 rounded-[26px] border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="flex flex-wrap items-center gap-2">
                    <AuthSpecBadge variant="neutral">Documento de referência</AuthSpecBadge>
                    <AuthSpecBadge variant="info">Leitura executiva + técnica</AuthSpecBadge>
                  </div>
                  <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                    A estrutura abaixo foi organizada para leitura rápida por produto, engenharia e avaliadores de processo. O topo resume contexto e decisão de desenho; as seções seguintes detalham requisitos, regras e aceite por fluxo.
                  </p>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  {executiveHighlights.map((item) => (
                    <CompactInsightCard key={item.title} title={item.title} text={item.text} />
                  ))}
                </div>

                <div className="spec-scrollbar mt-6 flex gap-3 overflow-x-auto pb-1 lg:hidden">
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

              <ExperienceLab />

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
                        text="Prioriza conversão e baixo atrito, com cadastro rápido, validação de CPF e recuperação de senha simples."
                      />
                      <NarrativeCard
                        title="Fornecedor"
                        icon={Building2}
                        text="Exige governança adicional, validação de CNPJ, aprovação operacional e rastreabilidade reforçada."
                      />
                    </div>

                    <div className="mt-6 rounded-[26px] border border-slate-200 bg-slate-50/90 p-5 dark:border-slate-800 dark:bg-slate-950/70">
                      <div className="flex flex-wrap items-center gap-3">
                        <AuthSpecBadge variant="danger">Crítico</AuthSpecBadge>
                        <AuthSpecBadge variant="info">LGPD friendly</AuthSpecBadge>
                        <AuthSpecBadge variant="success">Pronto para refinamento</AuthSpecBadge>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
                        O desenho considera proteção contra enumeração de contas, limitação de tentativas inválidas, validação documental de fornecedores e comunicação transacional consistente em todos os eventos sensíveis.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[30px] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/76 dark:shadow-[0_28px_80px_rgba(2,6,23,0.45)] sm:p-8">
                    <SectionKicker icon={AlertTriangle} title="Mapa de criticidade" />
                    <div className="mt-6 space-y-4">
                      <CriticalityRow label="Credenciais e sessão" variant="danger" detail="Maior exposição a fraude, takeover de conta e custos de suporte." />
                      <CriticalityRow label="Cadastro de fornecedor" variant="warning" detail="Risco operacional alto sem validação documental e aprovação controlada." />
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
                summary="A experiência de login deve ser objetiva, segura e resiliente a fraude. O sistema autentica clientes e fornecedores com os mesmos campos base, mas aplica regras contextuais de sessão e bloqueio conforme perfil e risco da tentativa."
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
                          'Hash de senha resistente a brute force e política de rotação de credenciais comprometidas.',
                          'Rate limit por IP, identidade e device para contencao de abuso automatizado.',
                          'Sessão revogável, refresh token rotativo e invalidação automática após logout, reset ou bloqueio.',
                        ]}
                      />
                      <CalloutCard
                        icon={MailCheck}
                        title="Mensagens e feedbacks"
                        items={[
                          'Falha generica sem expor existencia da conta.',
                          'Sucesso com redirecionamento contextual para o dashboard do perfil autenticado.',
                          'Conta bloqueada com orientação de suporte ou fluxo de redefinição de senha.',
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
                    <ActionBehaviorGrid title="Comportamento esperado dos componentes de ação" rows={loginActionRows} />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[0.95fr_1.15fr]">
                    <RuleListCard title="Políticas transversais de acesso" rows={crossRules} />
                    <AcceptanceChecklist title="Critérios de aceite da tela de login" items={loginAcceptance} />
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
                summary="O auto cadastro precisa separar claramente os dois perfis desde o início da jornada, minimizando fricção para clientes e reforçando validações corporativas para fornecedores."
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
                      footer="Ativação preferencialmente automática após confirmação de e-mail e aceite explícito das políticas."
                    />
                    <ProfilePanel
                      title="Fornecedor"
                      icon={Building2}
                      accent="amber"
                      rows={signupVendorRows}
                      footer="Fluxo condicionado à análise documental, aprovação operacional e eventual validação externa de CNPJ."
                    />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
                    <CalloutCard
                      icon={KeyRound}
                      title="Regras de senha e e-mail"
                      items={[
                        'Senha com mínimo de 10 caracteres, combinação de classes e bloqueio de senhas expostas em bases conhecidas.',
                        'E-mail validado em formato, domínio e unicidade antes da criação definitiva da conta.',
                        'Confirmação de senha apenas na interface; persistência somente após validações críticas.',
                      ]}
                    />
                    <CalloutCard
                      icon={BadgeCheck}
                      title="Validações documentais"
                      items={[
                        'CPF e CNPJ com máscara, normalização, dígitos verificadores e rejeição de padrões inválidos.',
                        'Unicidade por documento e e-mail em toda a base, inclusive contas pendentes ou inativas.',
                        'Fornecedor pode exigir anexos e aceite de termos comerciais antes de obter acesso pleno.',
                      ]}
                    />
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-slate-50/85 p-5 dark:border-slate-800 dark:bg-slate-950/70">
                    <SectionKicker icon={ArrowRight} title="Fluxos esperados por perfil" />
                    <div className="mt-5 grid gap-4 lg:grid-cols-3">
                      <FlowCard step="Seleção do perfil" text="A primeira decisão da tela deve separar Cliente e Fornecedor, alterando copy, campos e expectativas do processo." />
                      <FlowCard step="Validação e submissão" text="O formulário valida documento, e-mail, senha e aceite de termos antes do envio ao serviço de identidade." />
                      <FlowCard step="Pós cadastro" text="Cliente segue para confirmação de e-mail; fornecedor entra em estado Pendente com SLA de análise definido." />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <FieldMatrixTable title="Matriz formal de campos do cadastro de cliente" rows={signupFieldMatrixClient} />
                    <FieldMatrixTable title="Matriz formal de campos do cadastro de fornecedor" rows={signupFieldMatrixVendor} />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                    <ActionBehaviorGrid title="Botões, estados e mensagens do auto cadastro" rows={signupActionRows} />
                    <AcceptanceChecklist title="Critérios de aceite do auto cadastro" items={signupAcceptance} />
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
                summary="A redefinição de senha deve ser segura, silenciosa em relação à existência da conta e suficientemente orientada para reduzir tickets de suporte."
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
                        'Usuario informa o e-mail e recebe resposta neutra imediatamente.',
                        'Backoffice gera token assinado, registra evento e aciona envio assincrono do e-mail.',
                        'Página de redefinição valida token, força nova senha e encerra sessões anteriores.',
                      ]}
                    />
                    <CalloutCard
                      icon={FileLock2}
                      title="Mensagens de erro"
                      items={[
                        'Token expirado deve orientar nova solicitação sem revelar detalhes internos.',
                        'Token inválido ou reutilizado deve bloquear a ação e gerar evento de segurança.',
                        'Senha fora da política deve explicar critérios de forma objetiva antes do reenvio.',
                      ]}
                    />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1.15fr_0.95fr]">
                    <FieldMatrixTable title="Matriz formal de campos da recuperação de senha" rows={recoveryFieldMatrix} />
                    <ActionBehaviorGrid title="Comportamento dos componentes de recuperação" rows={recoveryActionRows} />
                  </div>

                  <AcceptanceChecklist title="Critérios de aceite da recuperação de senha" items={recoveryAcceptance} />
                </div>
              </AuthSpecSection>

              <AuthSpecSection
                id="non-functional"
                title="Requisitos Não Funcionais"
                eyebrow="Camada transversal"
                icon={ShieldCheck}
                expanded={expandedSections['non-functional']}
                onToggle={() => toggleSection('non-functional')}
                summary="Os requisitos não funcionais consolidam o padrão enterprise esperado para um sistema de autenticação exposto a alto volume, variação de dispositivos e risco de fraude."
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

                <ReleaseChecklist rows={acceptanceSummary} />
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

function ExperienceLab() {
  const [activeTab, setActiveTab] = useState('login');
  const [attempts, setAttempts] = useState(0);
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [demoAccounts, setDemoAccounts] = useState(() => loadStoredDemoAccounts());
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
    remember: true,
  });
  const [clientData, setClientData] = useState({
    fullName: '',
    email: '',
    cpf: '',
    phone: '',
    password: '',
    confirmPassword: '',
    accepted: false,
  });

  useEffect(() => {
    localStorage.setItem(demoStorageKey, JSON.stringify(demoAccounts));
  }, [demoAccounts]);

  const demoSeedAccounts = Object.entries(demoCredentials).map(([profile, credential]) => ({
    profile,
    email: credential.email,
    password: credential.password,
    destination: credential.destination,
    status: profile === 'vendor' ? 'Aprovado' : 'Ativo',
    source: 'seed',
  }));

  const allDemoAccounts = [...demoSeedAccounts, ...demoAccounts];
  const [vendorData, setVendorData] = useState({
    companyName: '',
    tradeName: '',
    cnpj: '',
    email: '',
    legalName: '',
    password: '',
    confirmPassword: '',
    accepted: false,
  });

  const previewSteps = {
    login: [
      'Validação de formato em tempo real.',
      'Resolução automática do perfil pelo e-mail.',
      attempts >= 5 ? 'Bloqueio progressivo armado na simulação.' : 'Controle de tentativas inválidas ativo.',
    ],
    client: [
      'CPF, e-mail e telefone obrigatórios.',
      'Senha com política mínima de 10 caracteres.',
      'Saída prevista: confirmação de e-mail antes do primeiro acesso.',
    ],
    vendor: [
      'CNPJ e e-mail corporativo obrigatórios.',
      'Responsável legal e aceite comercial exigidos.',
      'Saída prevista: pendência operacional para aprovação.',
    ],
  };

  function resetTransientState(nextTab) {
    setActiveTab(nextTab);
    setErrors({});
    setFeedback(null);
  }

  function handleLoginChange(field, value) {
    setLoginData((current) => ({ ...current, [field]: value }));
  }

  function handleClientChange(field, value) {
    setClientData((current) => ({ ...current, [field]: value }));
  }

  function handleVendorChange(field, value) {
    setVendorData((current) => ({ ...current, [field]: value }));
  }

  function handleLoginSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (!loginData.email.trim()) nextErrors.email = 'Informe o e-mail de acesso.';
    else if (!emailPattern.test(loginData.email.trim())) nextErrors.email = 'Use um e-mail válido.';

    if (!loginData.password) nextErrors.password = 'Informe a senha.';

    if (attempts >= 5) {
      setFeedback({
        tone: 'warning',
        title: 'Proteção temporária ativada',
        text: 'A simulação reproduz o bloqueio progressivo após múltiplas falhas. Troque as credenciais ou aguarde uma nova tentativa.',
      });
      setErrors(nextErrors);
      return;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setFeedback({
        tone: 'danger',
        title: 'Campos obrigatórios',
        text: 'Revise os dados informados antes de continuar.',
      });
      return;
    }

    const normalizedEmail = loginData.email.trim().toLowerCase();
    const matchedAccount = allDemoAccounts.find(
      (account) => account.email === normalizedEmail && account.password === loginData.password,
    );

    setErrors({});

    if (matchedAccount) {
      setAttempts(0);
      setFeedback({
        tone: 'success',
        title: 'Acesso autorizado',
        text: matchedAccount.status === 'Pendente'
          ? `Conta localizada com sucesso. O fluxo direciona para ${matchedAccount.destination}, mantendo o status pendente até a aprovação operacional.`
          : `Sessão criada com sucesso. O fluxo redireciona para ${matchedAccount.destination}.`,
      });
      return;
    }

    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setFeedback({
      tone: nextAttempts >= 5 ? 'warning' : 'danger',
      title: nextAttempts >= 5 ? 'Conta protegida temporariamente' : 'Credenciais inválidas',
      text: nextAttempts >= 5
        ? 'A simulação bloqueou novas tentativas e registraria o evento em auditoria.'
        : `Tentativa ${nextAttempts} de 5. A resposta continua genérica para não expor a existência da conta.`,
    });
  }

  function handleClientSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (clientData.fullName.trim().length < 3) nextErrors.fullName = 'Informe o nome completo.';
    const normalizedClientEmail = clientData.email.trim().toLowerCase();
    if (!emailPattern.test(normalizedClientEmail)) nextErrors.email = 'Use um e-mail válido.';
    else if (allDemoAccounts.some((account) => account.email === normalizedClientEmail)) nextErrors.email = 'Já existe conta para este e-mail.';
    if (!cpfPattern.test(clientData.cpf.trim())) nextErrors.cpf = 'Use o formato 000.000.000-00.';
    if (demoAccounts.some((account) => account.document === clientData.cpf.trim()) || clientData.cpf.trim() === '123.456.789-00') {
      nextErrors.cpf = 'CPF já cadastrado na base simulada.';
    }
    if (!phonePattern.test(clientData.phone.trim())) nextErrors.phone = 'Use o formato (00) 00000-0000.';
    if (!isStrongPassword(clientData.password)) nextErrors.password = 'A senha deve ter 10+ caracteres, maiúscula, minúscula e número.';
    if (clientData.confirmPassword !== clientData.password) nextErrors.confirmPassword = 'As senhas precisam coincidir.';
    if (!clientData.accepted) nextErrors.accepted = 'É necessário aceitar os termos.';

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setFeedback({
        tone: 'danger',
        title: 'Cadastro incompleto',
        text: 'A simulação encontrou pendências obrigatórias no formulário do cliente.',
      });
      return;
    }

    const createdAccount = {
      profile: 'client',
      email: normalizedClientEmail,
      password: clientData.password,
      destination: 'Área do cliente',
      status: 'Aguardando confirmação de e-mail',
      document: clientData.cpf.trim(),
      name: clientData.fullName.trim(),
    };

    setDemoAccounts((current) => [...current, createdAccount]);
    setLoginData((current) => ({
      ...current,
      email: createdAccount.email,
      password: createdAccount.password,
    }));
    setClientData({
      fullName: '',
      email: '',
      cpf: '',
      phone: '',
      password: '',
      confirmPassword: '',
      accepted: false,
    });
    setErrors({});
    setFeedback({
      tone: 'success',
      title: 'Conta criada',
      text: 'Conta criada na simulação e salva neste navegador. Você já pode testar o login com o mesmo e-mail e senha.',
    });
  }

  function handleVendorSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (vendorData.companyName.trim().length < 3) nextErrors.companyName = 'Informe a razão social.';
    if (vendorData.tradeName.trim().length < 3) nextErrors.tradeName = 'Informe o nome fantasia.';
    if (!cnpjPattern.test(vendorData.cnpj.trim())) nextErrors.cnpj = 'Use o formato 00.000.000/0000-00.';
    if (vendorData.cnpj.trim() === '12.345.678/0001-90') nextErrors.cnpj = 'CNPJ já existente na base simulada.';

    const normalizedVendorEmail = vendorData.email.trim().toLowerCase();
    if (!emailPattern.test(normalizedVendorEmail)) nextErrors.email = 'Use um e-mail corporativo válido.';
    else {
      const domain = normalizedVendorEmail.split('@')[1];
      if (publicMailDomains.includes(domain)) nextErrors.email = 'A simulação exige domínio corporativo para fornecedores.';
      if (allDemoAccounts.some((account) => account.email === normalizedVendorEmail)) {
        nextErrors.email = 'Já existe conta para este e-mail.';
      }
    }

    if (demoAccounts.some((account) => account.document === vendorData.cnpj.trim()) || vendorData.cnpj.trim() === '12.345.678/0001-90') {
      nextErrors.cnpj = 'CNPJ já existente na base simulada.';
    }

    if (vendorData.legalName.trim().length < 3) nextErrors.legalName = 'Informe o responsável legal.';
    if (!isStrongPassword(vendorData.password)) nextErrors.password = 'A senha deve ter 10+ caracteres, maiúscula, minúscula e número.';
    if (vendorData.confirmPassword !== vendorData.password) nextErrors.confirmPassword = 'As senhas precisam coincidir.';
    if (!vendorData.accepted) nextErrors.accepted = 'É necessário aceitar os termos comerciais.';

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setFeedback({
        tone: 'danger',
        title: 'Validação documental pendente',
        text: 'A simulação reproduz o comportamento do pré-cadastro do fornecedor antes da submissão.',
      });
      return;
    }

    const createdAccount = {
      profile: 'vendor',
      email: normalizedVendorEmail,
      password: vendorData.password,
      destination: 'Onboarding pendente do fornecedor',
      status: 'Pendente',
      document: vendorData.cnpj.trim(),
      name: vendorData.tradeName.trim(),
      legalName: vendorData.legalName.trim(),
    };

    setDemoAccounts((current) => [...current, createdAccount]);
    setLoginData((current) => ({
      ...current,
      email: createdAccount.email,
      password: createdAccount.password,
    }));
    setVendorData({
      companyName: '',
      tradeName: '',
      cnpj: '',
      email: '',
      legalName: '',
      password: '',
      confirmPassword: '',
      accepted: false,
    });
    setErrors({});
    setFeedback({
      tone: 'success',
      title: 'Pré-cadastro recebido',
      text: 'Pré-cadastro salvo neste navegador. O login já reconhece a conta criada e retorna o status pendente de aprovação.',
    });
  }

  const activeTone = feedback?.tone || 'info';

  return (
    <section className="rounded-[32px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/78 dark:shadow-[0_30px_90px_rgba(2,6,23,0.45)] sm:p-8">
      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(160deg,#111827_0%,#0f172a_44%,#111827_100%)] p-6 text-white dark:border-slate-700">
          <CodeNappPreviewLogo />

          <div className="mt-6 space-y-4">
            <AuthSpecBadge variant="neutral">Simulação funcional</AuthSpecBadge>
            <h2 className="font-[var(--font-display)] text-3xl tracking-tight text-white sm:text-4xl">
              Login e cadastro navegáveis no mesmo link.
            </h2>
            <p className="max-w-xl text-sm leading-7 text-slate-300">
              Este bloco funciona como uma prévia interativa do produto: campos reais, validações coerentes com a especificação e saídas diferentes para cliente e fornecedor.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Credenciais demo
              </p>
              <div className="mt-3 space-y-3 text-sm text-slate-200">
                <p><span className="font-semibold text-white">Cliente:</span> {demoCredentials.client.email}</p>
                <p><span className="font-semibold text-white">Senha:</span> {demoCredentials.client.password}</p>
                <p><span className="font-semibold text-white">Fornecedor:</span> {demoCredentials.vendor.email}</p>
                <p><span className="font-semibold text-white">Senha:</span> {demoCredentials.vendor.password}</p>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Estado observado
              </p>
              <div className="mt-3 space-y-3">
                <LabStatusPill label="Tentativas inválidas" value={`${attempts}/5`} tone={attempts >= 4 ? 'warning' : 'info'} />
                <LabStatusPill label="Fluxo ativo" value={activeTab === 'login' ? 'Login' : activeTab === 'client' ? 'Cadastro cliente' : 'Cadastro fornecedor'} tone="neutral" />
                <LabStatusPill label="Resultado esperado" value={activeTab === 'vendor' ? 'Aprovação' : 'Acesso / confirmação'} tone="success" />
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              O que esta prévia demonstra
            </p>
            <div className="mt-4 space-y-3">
              {previewSteps[activeTab].map((step) => (
                <div key={step} className="flex items-start gap-3 text-sm leading-7 text-slate-200">
                  <CheckCircle2 size={17} className="mt-1 shrink-0 text-emerald-400" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/70 sm:p-5">
          <div className="spec-scrollbar flex gap-2 overflow-x-auto pb-2">
            <DemoTabButton
              active={activeTab === 'login'}
              icon={LockKeyhole}
              label="Login"
              onClick={() => resetTransientState('login')}
            />
            <DemoTabButton
              active={activeTab === 'client'}
              icon={Users2}
              label="Cadastro cliente"
              onClick={() => resetTransientState('client')}
            />
            <DemoTabButton
              active={activeTab === 'vendor'}
              icon={Building2}
              label="Cadastro fornecedor"
              onClick={() => resetTransientState('vendor')}
            />
          </div>

          <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Sandbox autenticável
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  {activeTab === 'login' ? 'Acesso com resolução de perfil' : activeTab === 'client' ? 'Auto cadastro do cliente' : 'Pré-cadastro do fornecedor'}
                </h3>
              </div>
              <AuthSpecBadge variant={activeTone}>
                {feedback?.title || 'Pronto para simular'}
              </AuthSpecBadge>
            </div>

            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              {activeTab === 'login'
                ? 'Use as credenciais demo ou force erros para visualizar feedbacks, bloqueio progressivo e mensagem neutra.'
                : activeTab === 'client'
                  ? 'O formulário reproduz validações de obrigatoriedade, unicidade simulada, CPF, telefone, senha e aceite.'
                  : 'Esta versão simula o fluxo corporativo com CNPJ, e-mail de domínio empresarial, responsável legal e pendência operacional.'}
            </p>

            {feedback ? (
              <div className={[
                'mt-5 rounded-[20px] border px-4 py-3 text-sm leading-7',
                feedback.tone === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200'
                  : feedback.tone === 'warning'
                    ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200'
                    : feedback.tone === 'danger'
                      ? 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200'
                      : 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200',
              ].join(' ')}>
                {feedback.text}
              </div>
            ) : null}

            {activeTab === 'login' ? (
              <form className="mt-6 grid gap-4" onSubmit={handleLoginSubmit}>
                <LabField
                  label="E-mail"
                  value={loginData.email}
                  onChange={(value) => handleLoginChange('email', value)}
                  placeholder="voce@empresa.com"
                  error={errors.email}
                  type="email"
                />
                <LabField
                  label="Senha"
                  value={loginData.password}
                  onChange={(value) => handleLoginChange('password', value)}
                  placeholder="Digite sua senha"
                  error={errors.password}
                  type="password"
                />
                <LabCheckbox
                  checked={loginData.remember}
                  label="Lembrar dispositivo confiável"
                  onChange={(checked) => handleLoginChange('remember', checked)}
                />
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => resetTransientState('client')}
                    className="text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    Criar nova conta
                  </button>
                  <button
                    type="submit"
                    disabled={attempts >= 5}
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                  >
                    Entrar
                  </button>
                </div>
              </form>
            ) : null}

            {activeTab === 'client' ? (
              <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleClientSubmit}>
                <LabField label="Nome completo" value={clientData.fullName} onChange={(value) => handleClientChange('fullName', value)} error={errors.fullName} />
                <LabField label="E-mail" type="email" value={clientData.email} onChange={(value) => handleClientChange('email', value)} error={errors.email} />
                <LabField label="CPF" value={clientData.cpf} onChange={(value) => handleClientChange('cpf', value)} error={errors.cpf} placeholder="000.000.000-00" />
                <LabField label="Celular" value={clientData.phone} onChange={(value) => handleClientChange('phone', value)} error={errors.phone} placeholder="(00) 00000-0000" />
                <LabField label="Senha" type="password" value={clientData.password} onChange={(value) => handleClientChange('password', value)} error={errors.password} />
                <LabField label="Confirmar senha" type="password" value={clientData.confirmPassword} onChange={(value) => handleClientChange('confirmPassword', value)} error={errors.confirmPassword} />
                <div className="md:col-span-2">
                  <LabCheckbox checked={clientData.accepted} label="Aceito os termos de uso e a política de privacidade" onChange={(checked) => handleClientChange('accepted', checked)} error={errors.accepted} />
                </div>
                <div className="md:col-span-2 flex justify-end pt-2">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                  >
                    Criar conta de cliente
                  </button>
                </div>
              </form>
            ) : null}

            {activeTab === 'vendor' ? (
              <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleVendorSubmit}>
                <LabField label="Razão social" value={vendorData.companyName} onChange={(value) => handleVendorChange('companyName', value)} error={errors.companyName} />
                <LabField label="Nome fantasia" value={vendorData.tradeName} onChange={(value) => handleVendorChange('tradeName', value)} error={errors.tradeName} />
                <LabField label="CNPJ" value={vendorData.cnpj} onChange={(value) => handleVendorChange('cnpj', value)} error={errors.cnpj} placeholder="00.000.000/0000-00" />
                <LabField label="E-mail corporativo" type="email" value={vendorData.email} onChange={(value) => handleVendorChange('email', value)} error={errors.email} placeholder="contato@empresa.com" />
                <div className="md:col-span-2">
                  <LabField label="Responsável legal" value={vendorData.legalName} onChange={(value) => handleVendorChange('legalName', value)} error={errors.legalName} />
                </div>
                <LabField label="Senha" type="password" value={vendorData.password} onChange={(value) => handleVendorChange('password', value)} error={errors.password} />
                <LabField label="Confirmar senha" type="password" value={vendorData.confirmPassword} onChange={(value) => handleVendorChange('confirmPassword', value)} error={errors.confirmPassword} />
                <div className="md:col-span-2">
                  <LabCheckbox checked={vendorData.accepted} label="Aceito os termos comerciais e a análise documental" onChange={(checked) => handleVendorChange('accepted', checked)} error={errors.accepted} />
                </div>
                <div className="md:col-span-2 flex justify-end pt-2">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                  >
                    Enviar pré-cadastro
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function CodeNappPreviewLogo() {
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 92 64" className="h-12 w-auto text-white" fill="none" aria-hidden="true">
        <path d="M4 32 28 8h14L18 32l24 24H28L4 32Z" fill="currentColor" />
        <path d="m28 32 24-24h12L40 32l24 24H52L28 32Z" fill="currentColor" opacity="0.92" />
        <path d="m52 8 24 24-24 24H40l24-24L40 8h12Z" fill="currentColor" opacity="0.75" />
      </svg>
      <div className="font-[var(--font-display)] leading-none tracking-tight text-white">
        <div className="text-3xl">code</div>
        <div className="-mt-1 text-3xl">napp</div>
      </div>
    </div>
  );
}

function DemoTabButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-2 whitespace-nowrap rounded-2xl border px-4 py-3 text-sm font-medium transition',
        active
          ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white',
      ].join(' ')}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function LabField({ label, value, onChange, error, type = 'text', placeholder }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={[
          'w-full rounded-2xl border px-4 py-3 text-sm outline-none transition',
          error
            ? 'border-rose-300 bg-rose-50 text-rose-950 placeholder:text-rose-400 dark:border-rose-800 dark:bg-rose-950/20 dark:text-rose-100'
            : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500',
        ].join(' ')}
      />
      {error ? <span className="mt-2 block text-xs font-medium text-rose-600 dark:text-rose-300">{error}</span> : null}
    </label>
  );
}

function LabCheckbox({ checked, label, onChange, error }) {
  return (
    <label className="block">
      <span className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-400 dark:border-slate-600"
        />
        <span>{label}</span>
      </span>
      {error ? <span className="mt-2 block text-xs font-medium text-rose-600 dark:text-rose-300">{error}</span> : null}
    </label>
  );
}

function LabStatusPill({ label, value, tone }) {
  const toneClass = tone === 'warning'
    ? 'border-amber-400/30 bg-amber-400/10 text-amber-100'
    : tone === 'success'
      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
      : tone === 'info'
        ? 'border-sky-400/30 bg-sky-400/10 text-sky-100'
        : 'border-white/10 bg-white/5 text-slate-200';

  return (
    <div className={`rounded-2xl border px-3 py-3 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-75">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function loadStoredDemoAccounts() {
  try {
    const raw = localStorage.getItem(demoStorageKey);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((account) => (
      account
      && typeof account.email === 'string'
      && typeof account.password === 'string'
      && typeof account.profile === 'string'
      && typeof account.destination === 'string'
    ));
  } catch {
    return [];
  }
}

function isStrongPassword(value) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/.test(value);
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
        <div key={row.title} className="rounded-[26px] border border-slate-200 bg-white/88 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] transition-transform duration-200 hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900/72">
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
        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Rolagem horizontal habilitada em telas menores
        </p>
      </div>
      <div className="spec-scrollbar overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/80 dark:bg-slate-900/80">
            <tr className="text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3 font-semibold">Campo</th>
              <th className="px-4 py-3 font-semibold">Tipo</th>
              <th className="px-4 py-3 font-semibold">Formato</th>
              <th className="px-4 py-3 font-semibold">Obrig.</th>
              <th className="px-4 py-3 font-semibold">Validação</th>
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
      <h3 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">Consolidação de aceite e prontidão</h3>
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

function CompactInsightCard({ title, text }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white/88 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900/72">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{text}</p>
    </div>
  );
}
