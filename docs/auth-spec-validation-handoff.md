# Auth Spec Validation Handoff

## Objetivo

Página pública de validação para candidatura e portfólio técnico, com foco em especificação funcional de autenticação para uma plataforma de compras online.

Rota publicada no `frontend`:

- `/validation/auth-spec`

## O que foi entregue

- Página em React + Tailwind com visual de documentação SaaS.
- Sidebar, seções colapsáveis, badges, timeline e requisitos funcionais/não funcionais.
- Conteúdo textual corporativo para:
  - Tela de Login
  - Tela de Auto Cadastro
  - Recuperação de Senha
  - Requisitos Não Funcionais
- Dark mode.
- Ajustes de responsividade e barras de rolagem em áreas com overflow.
- Revisão de acentuação e textos visíveis.

## Simulação interativa incluída

No mesmo link existe uma área de simulação funcional de front-end:

- Login
- Cadastro de cliente
- Pré-cadastro de fornecedor

### Comportamento da simulação

- Valida campos no front-end.
- Exibe mensagens de erro e sucesso coerentes com a especificação.
- Controla tentativas inválidas no login.
- Salva contas criadas em `localStorage`.
- Permite login com contas criadas na própria simulação, no mesmo navegador.
- Não grava nada no backend real.
- Não cria usuários reais no banco.

### Credenciais demo seed

- Cliente:
  - `cliente@codenapp.com`
  - `Cliente@123`
- Fornecedor:
  - `fornecedor@codenapp.com`
  - `Fornecedor@123`

## Observações importantes

- A persistência das contas simuladas é local ao navegador via `localStorage`.
- Se limpar cache/dados do site, os cadastros simulados somem.
- O fornecedor criado na simulação é reconhecido no login com status pendente.
- O link foi mantido público porque já havia sido enviado na candidatura.
- A página injeta `noindex` para reduzir exposição em buscadores.

## Arquivos principais

- `frontend/src/pages/AuthSpecPage.jsx`
- `frontend/src/components/authSpec/AuthSpecSidebar.jsx`
- `frontend/src/components/authSpec/AuthSpecSection.jsx`
- `frontend/src/index.css`
- `frontend/src/main.jsx`
- `frontend/vite.config.mjs`
- `frontend/nixpacks.toml`

## Como testar

1. Abrir `/validation/auth-spec`
2. Testar login com as credenciais demo
3. Criar um cadastro de cliente ou fornecedor
4. Voltar para a aba de login
5. Entrar com o e-mail e senha recém-criados

## Build

Última validação local:

- `npm run build` em `frontend`

## Commits de referência

- `576eb07` Fix auth spec non-functional section render
- `aa3f825` Polish auth spec scrollbars and typography
- `75382dc` Add interactive auth simulation to spec page
- `a262c94` Persist auth simulation accounts locally

## Próximos passos possíveis

- Remover ou proteger a rota pública após a avaliação.
- Integrar a simulação a um backend real, se virar feature de produto.
- Extrair os componentes da simulação para reaproveitamento em portfólio.
