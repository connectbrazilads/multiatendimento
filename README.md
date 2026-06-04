# Sistema Multiatendimento

Um sistema SaaS Multi-tenant completo para gestão de atendimento ao cliente via WhatsApp, projetado com arquitetura moderna e inteligência artificial nativa.

## 🚀 Tecnologias e Stack

- **Frontend:** React + Vite, Socket.io-client (comunicações em tempo real)
- **Estilização:** CSS Vanilla, com foca em design UX Premium (Violet/White theme)
- **Backend:** Node.js, Express
- **Banco de Dados:** PostgreSQL com Prisma ORM
- **Integração WhatsApp:** Evolution API
- **Inteligência Artificial:** Google Gemini API (transcrição de áudios, leitura de imagem e Chatbot integrado)
- **Deploy:** Easypanel (Docker) com CI/CD (GitHub auto-deploy)

## 🏗️ Arquitetura

- **Multi-tenant:** Arquitetura segura focada no isolamento de dados onde cada empresa gerencia seu próprio ambiente através do `tenantId`.
- **Comunicação em Tempo Real:** WebSockets robustos via Socket.io garantindo sincronia imediata das mensagens do WhatsApp para todos os agentes online.
- **Autenticação Segura:** Autenticação por JWT com interceptor global de 401.
- **Processos em Background:** Cron jobs contínuos:
  - Agendamento de envios de mensagem (verificações a cada minuto).
  - Retry de downloads de mídias (a cada 5 minutos).
  - Limpeza noturna (às 03:00).

## 💡 Principais Funcionalidades

- **Inbox Centralizada (Live Chat):** Interface robusta de atendimento permitindo múltiplos agentes gerenciando contatos, áudios, imagens e transferências, em tempo real.
- **Integração Nativa de IA (Gemini):**
  - **Transcrição de Áudios:** Transcreve instantaneamente notas de voz do WhatsApp.
  - **Auto-Tags e Resumos:** Analisa o histórico de conversas e gera resumos do atendimento na transferência/finalização.
  - **Chatbot Inteligente:** Respostas automatizadas usando base de conhecimento própria alimentada por arquivos e histórico.
- **Disparo em Massa e Prospecção:** Módulo de lead scraper (SerpAPI) integrado com envio de mensagens formatadas (com anexo e intervalos para proteção de banimento).
- **Controle de SLA & CSAT:** Acompanhamento de tempo de resposta e pesquisas de satisfação após o encerramento do atendimento.
- **Chat Interno da Equipe:** Chat lateral persistente para comunicação rápida entre agentes.
- **CRM e Painel Kanban:** Acompanhamento e link de contatos do WhatsApp com o CRM nativo de funil de vendas.

## 🛠️ Como Executar o Projeto Localmente

1. **Requisitos:** Node.js (v18+) e PostgreSQL rodando.
2. **Configuração de Variáveis:** Crie e configure o arquivo `.env` na pasta `backend` com a URL do banco, URL da API do Evolution e credenciais.
3. **Instalando e rodando:**

**Backend (Porta 3003):**
\`\`\`bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
\`\`\`

**Frontend (Porta 3000):**
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

## 📦 Estrutura de Volumes (Deploy)

Para o deploy Docker via Easypanel, utilize o Nixpacks. O sistema exige o mapeamento do diretório de uploads local na configuração do painel para o processamento de áudios, PDFs e imagens nativas:
\`\`\`
/srv/multiatendimento/uploads → /app/uploads
\`\`\`

## 📝 Licença
Sistema de uso privado. Todos os direitos reservados.
