---
name: Sistema Multiatendimento
description: Premium Violet/White WhatsApp ticket management platform
colors:
  primary: "#D4AF37"
  primary-hover: "#F2D06B"
  neutral-bg-light: "#f8fafc"
  neutral-bg-dark: "#0f1115"
  neutral-surface-light: "#FFFFFF"
  neutral-surface-dark: "#141821"
  border-light: "#cbd5e1"
  border-dark: "#262d3b"
  text-light: "#0f172a"
  text-dark: "#FFFFFF"
typography:
  display:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(1.8rem, 5vw, 2.4rem)"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "8px"
  md: "12px"
  lg: "20px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#000000"
    rounded: "{rounded.sm}"
    padding: "10px 24px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
---

# Design System: Sistema Multiatendimento

## 1. Overview

**Creative North Star: "The Violet Portal"**

O foco principal do design é a usabilidade limpa e nítida para operadores de suporte. O violeta e o dourado atuam estritamente como guias visuais e marcadores de atenção em uma base sóbria (branca ou cinza profunda). Isso garante que o cansaço visual seja mínimo durante o uso intensivo de 8 horas.

**Key Characteristics:**
- Foco absoluto no conteúdo (balões de mensagens estruturados).
- Destaques pontuais de dourado (`#D4AF37`) e violeta suave (`var(--bg-msg-ai)`).
- Visual plano e limpo por padrão, sem sombras pesadas ou glassmorphism supérfluo.

## 2. Colors

A paleta é dividida entre tons neutros para base e sotaques para dar foco.

### Primary
- **Dourado Radiante** (`#D4AF37` / oklch(77.7% 0.17 84.8)): Usado para destaques, ações primárias, botões e tabs selecionadas.
- **Dourado Brilhante** (`#F2D06B` / oklch(84.5% 0.15 88.5)): Usado para os estados de hover das ações.

### Neutral
- **Fundo Base Claro** (`#f8fafc`): Cor de fundo principal no tema claro.
- **Fundo Base Escuro** (`#0f1115`): Cor de fundo principal no tema escuro.
- **Fundo Superfície Claro** (`#FFFFFF`): Cor dos painéis e cards no tema claro.
- **Fundo Superfície Escuro** (`#141821`): Cor dos painéis e cards no tema escuro.

### Named Rules
**The 10% Accent Rule.** O dourado e o violeta nunca devem ocupar mais do que 10% da área útil de qualquer tela de visualização de mensagens. A escassez do tom mantém o operador focado.

## 3. Typography

**Display Font:** Syne (com sans-serif)
**Body Font:** Inter (com sans-serif)

A tipografia do sistema utiliza fontes modernas, garantindo excelente legibilidade.

### Hierarchy
- **Display** (Bold (700), clamp(1.8rem, 5vw, 2.4rem), 1.2): Usado em títulos do dashboard e grandes cabeçalhos de seções.
- **Body** (Regular (400), 0.95rem, 1.5): Usado em todas as mensagens do chat e textos de conteúdo corrido.

## 4. Elevation

O sistema utiliza usabilidade plana por padrão. Depth (profundidade) é criada através da distinção sutil de cores de painel e bordas (`border-color`), com sombras reservadas estritamente para elementos flutuantes.

### Shadow Vocabulary
- **Foco e Flutuação** (`0 4px 12px rgba(0,0,0,0.05)`): Usado sob modais, dropdowns e menus popover ativos para separá-los do plano de fundo.

## 5. Components

### Buttons
- **Shape:** Arredondado suave (8px, `--radius-sm`).
- **Primary:** Fundo dourado (`--accent`) com texto preto e padding de `10px 24px`.
- **Hover / Focus:** Transição suave para dourado claro (`--accent-hover`).

### Cards / Containers
- **Corner Style:** Arredondado médio (12px, `--radius-md`).
- **Background:** Superfície principal (`--bg-surface` ou `--bg-panel`).
- **Border:** Margem sutil (`--border-color`).

### Inputs / Fields
- **Style:** Fundo limpo (`--bg-panel`) com borda fina (`--border-color`) e cantos de 8px.
- **Focus:** Foco nítido com anel dourado (`--accent`).

## 6. Do's and Don'ts

### Do:
- **Do** Manter o contraste de leitura do chat maior que 4.5:1 em ambos os temas.
- **Do** Usar transições exponenciais rápidas (`cubic-bezier(0.4, 0, 0.2, 1)`) apenas para hover e foco.

### Don't:
- **Don't** Usar gradientes coloridos ou degradês em textos.
- **Don't** Colocar bordas de destaque laterais coloridas com espessura maior que 1px.
- **Don't** Utilizar desfoques de fundo (glassmorphism) a menos que em painéis flutuantes explícitos.
