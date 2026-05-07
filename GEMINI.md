# Sistema Multiatendimento — Contexto do Projeto

## Stack Técnica
- **Frontend:** React + Vite, CSS inline (sem Tailwind), Socket.io-client
- **Backend:** Node.js + Express + Prisma ORM + PostgreSQL
- **IA:** Gemini API (transcrição de áudio, visão, bot)
- **WhatsApp:** Evolution API
- **Deploy:** Easypanel (Docker) + GitHub auto-deploy
- **Volume persistente:** `/srv/multiatendimento/uploads` → `/app/uploads`

## Arquitetura
- Multi-tenant: cada empresa tem seu próprio `tenantId`
- WebSockets via Socket.io para mensagens em tempo real
- Autenticação JWT com interceptor global de 401 no frontend
- Cron jobs: agendamento de mensagens (1 min) + retry de mídias (5 min) + limpeza noturna (03:00)

## Skills & Diretrizes Automáticas

O agente DEVE aplicar as seguintes skills automaticamente conforme o contexto para manter a estabilidade e qualidade técnica:

| Contexto | Skill a aplicar | Por que? |
| :--- | :--- | :--- |
| **Bugs / Erros** | `@systematic-debugging` | Resolução definitiva de problemas de estado/sync. |
| **Prisma / Banco** | `@prisma-expert` | Gerenciamento de schema e queries otimizadas. |
| **React / Frontend** | `@react-patterns` | Refatoração de componentes grandes (ex: Inbox.jsx). |
| **Backend / Express**| `@nodejs-backend-patterns` | Segurança em middlewares e controllers. |
| **WhatsApp / Webhooks**| `@whatsapp-automation` | Estabilidade na Evolution API e mídias. |
| **UX / UI** | `@high-end-visual-design` | Manutenção do tema Premium Violet/White. |
| **IA / Gemini** | `@gemini-api-integration` | Transcrições e bots com alta precisão. |
| **Multi-tenant** | `@saas-multi-tenant` | Garantia de isolamento por `tenantId`. |
| **Segurança** | `@security-auditor` | Proteção de endpoints e auditoria de JWT. |
| **Qualidade** | `@tdd-workflow` | Antes de alterações críticas no backend. |

## Padrões Estabelecidos
- Sempre usar optional chaining (`?.`) ao acessar `contact`, `ticket`, `instance`
- Sempre proteger `if (!me) return <Loading />` em páginas com perfil de usuário
- Imports do React devem incluir todos os hooks usados (`useCallback`, `useRef`, etc.)
- Commits em inglês no formato `type: description`
- PowerShell: usar `;` em vez de `&&` para encadear comandos
- Backend porta 3003, Frontend porta 3000

## Arquivos Críticos
- `frontend/src/pages/Inbox.jsx` — componente principal, 1400+ linhas
- `backend/src/controllers/webhookController.js` — entrada de mensagens WhatsApp
- `backend/src/services/evolutionService.js` — interface com Evolution API
- `backend/src/controllers/ticketController.js` — envio de mensagens e mídias
- `backend/src/services/scheduleProcessor.js` — cron jobs e retry de mídias
- `backend/prisma/schema.prisma` — schema do banco de dados
