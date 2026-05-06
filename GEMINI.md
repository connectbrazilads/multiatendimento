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

## Skills Automáticas

O agente DEVE aplicar as seguintes skills automaticamente conforme o contexto, sem precisar ser solicitado:

| Situação | Skill a aplicar |
|----------|----------------|
| Qualquer bug, erro ou comportamento inesperado | @debugging-strategies |
| Rotas de API, autenticação, JWT, permissões | @security-auditor |
| Criação ou modificação de endpoints REST | @api-design-principles |
| Mudanças no `schema.prisma` ou migrations | @database-migration |
| Componentes React, CSS, layout, UX | @frontend-design |
| Planejamento de nova feature ou arquitetura | @brainstorming |
| Lentidão, uso de CPU/memória, queries lentas | @performance-profiling |
| Antes de qualquer `git push` | @code-review |

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
