$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
$taskNode = 'D:\Program Files\nodejs\node.exe'
$taskMutex = New-Object System.Threading.Mutex($false, 'Global\LoudSpeakSupervisor3210')
if (-not $taskMutex.WaitOne(0)) { exit 0 }
try {
    Set-Location -LiteralPath $taskRoot
    $env:PORT = '3210'
    $env:HOST = '0.0.0.0'
    while ($true) {
        # Leave an existing listener alone, including a manually started instance.
        $taskListener = Get-NetTCPConnection -LocalPort 3210 -State Listen -ErrorAction SilentlyContinue
        if ($taskListener) { Start-Sleep -Seconds 10; continue }
        try {
            $taskProcess = Start-Process -FilePath $taskNode -ArgumentList 'server.cjs' -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskRoot 'server-output.log') -RedirectStandardError (Join-Path $taskRoot 'server-error.log') -PassThru
            $taskProcess.WaitForExit()
        } catch {
            Add-Content -LiteralPath (Join-Path $taskRoot 'supervisor.log') -Value ("{0:o} {1}" -f (Get-Date), $_.Exception.Message)
        }
        Start-Sleep -Seconds 5
    }
} finally {
    $taskMutex.ReleaseMutex()
    $taskMutex.Dispose()
}
