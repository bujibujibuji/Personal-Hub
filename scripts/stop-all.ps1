# Personal Hub 一键停止
# 用法：双击项目根目录的 stop-all.cmd，或在 PowerShell 中运行本脚本
$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$root = Split-Path -Parent $PSScriptRoot
$ports = 8080, 5173, 5174

Write-Host ''
Write-Host '===== Personal Hub 停止 =====' -ForegroundColor Cyan

$stopped = $false
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        $stopped = $true
        Write-Host "停止端口 $port 上的进程（PID $($conn.OwningProcess)）..."
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Seconds 2

# 清理本项目残留的 Maven / Node 进程
$leftovers = Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='java.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*$root*" }
foreach ($proc in $leftovers) {
    $stopped = $true
    Write-Host "清理残留进程 PID $($proc.ProcessId)（$($proc.Name)）..."
    Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 1

# 关闭本项目专用的命令行窗口
Get-CimInstance Win32_Process -Filter "Name='cmd.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'Personal Hub (Backend|Frontend)' } |
    ForEach-Object {
        Write-Host "关闭窗口 PID $($_.ProcessId)..."
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }

if (-not $stopped) { Write-Host '没有发现正在运行的服务。' }

Write-Host ''
foreach ($port in $ports) {
    $busy = Test-NetConnection 127.0.0.1 -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue
    Write-Host "端口 $port：$(if ($busy) { '仍被占用' } else { '已释放' })"
}

Write-Host ''
Write-Host '前端与后端已停止。MySQL 服务保持运行，数据不受影响。' -ForegroundColor Cyan
Write-Host '如需停止数据库：Stop-Service MySQL84'
Write-Host ''
