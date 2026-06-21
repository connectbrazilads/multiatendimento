param(
  [string]$TaskName = "FirebirdCRMClient",
  [string]$InstallDir = $PSScriptRoot,
  [switch]$SkipTask
)

$ErrorActionPreference = "Stop"

Write-Host "Instalando client Firebird em $InstallDir"
Set-Location $InstallDir

$exePath = Join-Path $InstallDir "FirebirdCRMClient.exe"
if (-not (Test-Path $exePath)) {
  throw "Executavel nao encontrado em $exePath. Use o pacote atualizado com FirebirdCRMClient.exe."
}

New-Item -ItemType Directory -Force -Path (Join-Path $InstallDir "logs") | Out-Null

$envPath = Join-Path $InstallDir ".env"
$examplePath = Join-Path $InstallDir ".env.example"
if (-not (Test-Path $envPath)) {
  Copy-Item $examplePath $envPath
  Write-Host "Arquivo .env criado a partir do template."
} else {
  Write-Host "Arquivo .env ja existe, mantido."
}

if (-not $SkipTask) {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principalCheck = New-Object Security.Principal.WindowsPrincipal($identity)
  $isAdmin = $principalCheck.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $isAdmin) {
    Write-Warning "Execute como Administrador para criar a tarefa agendada. A instalacao dos arquivos continuara sem a tarefa."
    $SkipTask = $true
  }
}

if (-not $SkipTask) {
  Write-Host "Criando tarefa agendada $TaskName..."
  $action = New-ScheduledTaskAction -Execute $exePath -WorkingDirectory $InstallDir
  $trigger = New-ScheduledTaskTrigger -AtStartup
  $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew

  $task = New-ScheduledTask -Action $action -Trigger $trigger -Principal $principal -Settings $settings

  try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue | Out-Null
  } catch {}

  Register-ScheduledTask -TaskName $TaskName -InputObject $task | Out-Null
  Write-Host "Tarefa $TaskName criada."
}

Write-Host "Instalacao concluida."
Write-Host "Agora edite o arquivo .env."
Write-Host "Depois execute inspect-schema.cmd para gerar o schema-report.json antes de sincronizar."
Write-Host "Para sincronizar uma vez, execute: FirebirdCRMClient.exe --once"
