param(
  [string]$TaskName = "FirebirdCRMClient",
  [switch]$RemoveData
)

$ErrorActionPreference = "Stop"

try {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue | Out-Null
  Write-Host "Tarefa $TaskName removida."
} catch {
  Write-Host "Tarefa $TaskName nao encontrada ou ja removida."
}

if ($RemoveData) {
  foreach ($item in @(".env", "state.json", "logs")) {
    if (Test-Path $item) {
      Remove-Item $item -Recurse -Force
      Write-Host "$item removido."
    }
  }
}

Write-Host "Desinstalacao concluida."
