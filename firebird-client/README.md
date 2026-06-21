# Firebird Client

Cliente de integração para rodar no servidor da empresa, ler o Firebird localmente e enviar os dados para o CRM por HTTPS.

## O que ele faz

- Lê clientes de `ICLIENTES`
- Lê equipamentos de `IXLEQUIPAMENTO`
- Lê contratos de `IXLCONTRATOS`
- Lê atendimentos/OS de `VIEW_ATENDIMENTO_HISTORICO`
- Envia os lotes para o endpoint `/api/integrations/firebird/push`
- Mantém um cursor local em `state.json`
- Registra logs em `logs/client.log` com rotação automática
- No pacote atualizado, roda como `FirebirdCRMClient.exe` e não depende de Python instalado

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

## Próximos passos

- Ajustar os nomes dos campos de `serviceOrders` caso você queira um mapeamento mais fiel
- Acrescentar novas telas no CRM com base nos dados que começarem a chegar
