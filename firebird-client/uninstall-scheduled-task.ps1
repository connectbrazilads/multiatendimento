<#
  Remove a tarefa agendada criada por install-scheduled-task.ps1.
  Rode como Administrador.
#>

param(
    [string]$TaskName = "AgenteCRM iLux"
)

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Execute este script como Administrador (botao direito no PowerShell > Executar como administrador)." -ForegroundColor Red
    exit 1
}

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Tarefa '$TaskName' removida." -ForegroundColor Green
    Write-Host "Se quiser voltar a usar a opcao antiga, marque 'Iniciar o agente com o Windows' na tela do agente e salve as configuracoes." -ForegroundColor Cyan
} else {
    Write-Host "Nenhuma tarefa '$TaskName' encontrada -- nada para remover." -ForegroundColor Yellow
}
