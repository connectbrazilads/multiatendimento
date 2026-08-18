<#
  Configura o Agente iLux CRM para iniciar sozinho pelo Agendador de Tarefas
  do Windows, mesmo que ninguem faca login depois que o servidor reiniciar.

  Por que isso e diferente da opcao "Iniciar o agente com o Windows" (dentro
  do proprio agente): aquela opcao usa a pasta "Inicializar" do Windows, que
  so dispara quando ALGUEM efetivamente faz login na conta. Esta tarefa
  dispara direto na inicializacao do sistema, "executando estando o usuario
  conectado ou nao" -- nao depende de ninguem digitar a senha.

  Rode este script como Administrador, no MESMO usuario do Windows que ja usa
  o agente hoje (precisa manter o mesmo acesso a rede/pasta do Firebird e as
  pastas financeiras).
#>

param(
    [string]$TaskName = "AgenteCRM iLux",
    [string]$ExePath = (Join-Path $PSScriptRoot "FirebirdCRMClient.exe")
)

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Execute este script como Administrador (botao direito no PowerShell > Executar como administrador)." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $ExePath)) {
    Write-Host "Nao encontrei $ExePath." -ForegroundColor Red
    Write-Host "Rode este script de dentro da pasta do agente, ou passe -ExePath 'caminho\FirebirdCRMClient.exe'." -ForegroundColor Red
    exit 1
}

Write-Host "Isso vai pedir o usuario e a senha do Windows que o agente usa hoje." -ForegroundColor Cyan
Write-Host "A senha fica guardada de forma protegida pelo proprio Windows (Agendador de Tarefas), nao em texto puro." -ForegroundColor Cyan
$credential = Get-Credential -Message "Usuario e senha do Windows usados pelo agente"

# Substitui o atalho antigo da pasta Inicializar, se existir -- os dois juntos
# fariam o agente abrir duas vezes (um na inicializacao do sistema, outro no
# login), disputando o mesmo state.json e o mesmo log.
$startupBat = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup\AgenteCRM.bat"
if (Test-Path $startupBat) {
    Remove-Item $startupBat -Force
    Write-Host "Removido o atalho antigo da pasta Inicializar (essa tarefa agendada substitui ele)." -ForegroundColor Cyan
    Write-Host "Pode deixar a caixa 'Iniciar o agente com o Windows' desmarcada na tela do agente a partir de agora." -ForegroundColor Cyan
}

$workingDirectory = Split-Path $ExePath -Parent
$action = New-ScheduledTaskAction -Execute $ExePath -Argument "--minimized" -WorkingDirectory $workingDirectory
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Seconds 0)

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Ja existe uma tarefa '$TaskName' -- substituindo." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -User $credential.UserName `
    -Password $credential.GetNetworkCredential().Password `
    -RunLevel Limited `
    -Force | Out-Null

Write-Host ""
Write-Host "Tarefa '$TaskName' criada com sucesso." -ForegroundColor Green
Write-Host "A partir da proxima inicializacao do Windows, o agente sobe sozinho, mesmo sem ninguem logar." -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Yellow
Write-Host " - Nesse modo, o icone da bandeja NAO aparece, mesmo se alguem fizer login depois --" -ForegroundColor Yellow
Write-Host "   o processo roda numa sessao separada e invisivel do Windows, de proposito." -ForegroundColor Yellow
Write-Host "   Para conferir se esta rodando: olhe logs\client.log, ou procure o processo" -ForegroundColor Yellow
Write-Host "   'FirebirdCRMClient.exe' no Gerenciador de Tarefas." -ForegroundColor Yellow
Write-Host " - NAO abra o agente manualmente (duplo clique) enquanto essa tarefa estiver ativa:" -ForegroundColor Yellow
Write-Host "   os dois processos disputariam o mesmo state.json e o mesmo log ao mesmo tempo." -ForegroundColor Yellow
Write-Host "   Se precisar mexer na tela (trocar configuracao, ver o log ao vivo), pare a tarefa antes:" -ForegroundColor Yellow
Write-Host "   Stop-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
Write-Host "   ...e depois de fechar a janela, inicie a tarefa de novo:" -ForegroundColor Yellow
Write-Host "   Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
Write-Host ""
Write-Host "Para testar agora, sem esperar reiniciar o servidor:" -ForegroundColor Cyan
Write-Host "   Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
Write-Host "Para remover esta configuracao: uninstall-scheduled-task.ps1" -ForegroundColor Cyan
