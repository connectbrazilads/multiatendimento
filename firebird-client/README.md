# Firebird Client

Cliente de integração para rodar no servidor da empresa, ler o Firebird localmente e enviar os dados para o CRM por HTTPS.

## O que ele faz

- Lê clientes de `ICLIENTES`
- Lê equipamentos de `IXLEQUIPAMENTO`
- Lê contratos de `IXLCONTRATOS`
- Sincroniza uma janela recente de contas a receber de `IRECEITAS`
- Sincroniza contadores atuais e anteriores de `IXLEQUIPAMENTOMED`
- Sincroniza novas O.S. e atendimentos de forma incremental, em lotes pequenos, sem reler todo o histórico
- Envia os lotes para o endpoint `/api/integrations/firebird/push`
- Mantém um cursor local em `state.json`
- Registra logs em `logs/client.log` com rotação automática
- Mantém um listener HTTPS para abrir O.S. imediatamente e devolver o `SEQOS`
- Guarda resultados em `command-results.json` para impedir duplicação após falha de callback
- Consulta somente os cinco chamados anteriores e os atendimentos da nova O.S. para montar o PDF completo
- No pacote atualizado, roda como `FirebirdCRMClient.exe` e não depende de Python instalado
- Monitora, sem alterar os arquivos, uma ou mais pastas de PDFs oficiais exportados em **Documentos em Lote**
- Associa Nota/Fatura, Demonstrativo e boleto pelo conteúdo (CNPJ, número, datas e valor), sem depender do nome do arquivo

Os dados financeiros e os contadores são atualizados em lotes. A primeira execução carrega a janela inicial; depois, novos registros seguem por cursor. Uma vez por hora o agente confere os títulos em aberto, os 1.000 títulos mais recentes e os 1.000 medidores mais recentes. Isso mantém baixas e novas leituras atualizadas sem varrer todas as tabelas a cada ciclo.

O incremental de O.S. vem ativo por padrão. Para desativá-lo deliberadamente, configure `SYNC_SERVICE_ORDERS_INCREMENTAL=false`.

## Instalação

Use o pacote atualizado que inclui `FirebirdCRMClient.exe`.
Depois de descompactar:

1. Execute `install.bat` ou `install.ps1`
2. Edite o arquivo `.env`
3. Rode `FirebirdCRMClient.exe` para validar

O instalador cria o arquivo `.env` automaticamente se ele não existir.

Depois preencha o arquivo `.env` com:

- caminho do banco Firebird
- usuário e senha
- URL do CRM na VPS
- slug do tenant
- token de sincronização

As pastas financeiras podem ser escolhidas diretamente na aba **Documentos financeiros** da interface. Use caminhos UNC (`\\servidor\pasta`) para compartilhamentos de rede. A primeira indexação lê todos os PDFs em segundo plano; as seguintes processam somente arquivos novos ou alterados.

## Execução

Inspecionar tabelas e campos antes de sincronizar:

```bash
inspect-schema.cmd
```

Esse comando gera `schema-report.json`. Envie esse arquivo para definirmos exatamente quais tabelas e campos do Firebird entram no CRM.

Rodar uma vez:

```bash
FirebirdCRMClient.exe --once
```

Rodar em loop contínuo:

```bash
FirebirdCRMClient.exe
```

Forçar ressincronização completa:

```bash
FirebirdCRMClient.exe --once --full
```

## Notas de segurança

- O client só faz conexão de saída para a VPS
- O token enviado em `CRM_SYNC_TOKEN` precisa ser igual ao configurado no CRM
- Se quiser, este processo pode ser colocado no Agendador do Windows ou em um Windows Service
- Os arquivos antigos de log ficam em `logs/client.log.1`, `logs/client.log.2` e assim por diante, até o limite configurado

## Dados usados no CRM 360

- `IRECEITAS`: títulos, vencimentos, pagamentos e valores em aberto
- `IXLEQUIPAMENTOMED`: contador atual, anterior e datas de leitura
- `IXLOS`: última manutenção e menções técnicas de peças/suprimentos
