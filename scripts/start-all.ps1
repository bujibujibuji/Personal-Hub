# Personal Hub 一键启动
# 用法：双击项目根目录的 start-all.cmd，或在 PowerShell 中运行本脚本
$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$root = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $root 'backend'
$frontendDir = Join-Path $root 'frontend'
$ports = 8080, 5173, 5174

Write-Host ''
Write-Host '===== Personal Hub 启动 =====' -ForegroundColor Cyan

# 1. MySQL
Write-Host '[1/4] 检查 MySQL 服务...'
$service = Get-Service MySQL84 -ErrorAction SilentlyContinue
if (-not $service) {
    Write-Warning '未找到 MySQL84 服务，请确认 MySQL 已安装。'
} elseif ($service.Status -eq 'Running') {
    Write-Host '      MySQL 已在运行。' -ForegroundColor Green
} else {
    try {
        Start-Service MySQL84 -ErrorAction Stop
        Write-Host '      MySQL 已启动。' -ForegroundColor Green
    } catch {
        Write-Warning "MySQL 启动失败：$($_.Exception.Message)（可能需要以管理员身份运行）"
    }
}

# 2. 清理占用端口的旧进程
Write-Host '[2/4] 清理占用端口的旧进程...'
$found = $false
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        $found = $true
        Write-Host "      端口 $port 被 PID $($conn.OwningProcess) 占用，正在停止..."
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}
if (-not $found) { Write-Host '      没有发现占用。' }
Start-Sleep -Seconds 2

# 3. 启动后端
Write-Host '[3/4] 启动后端（新窗口，端口 8080）...'
Start-Process -FilePath 'cmd.exe' -ArgumentList @(
    '/k',
    "title Personal Hub Backend && cd /d `"$backendDir`" && mvn spring-boot:run"
) | Out-Null

$backendReady = $false
$deadline = (Get-Date).AddMinutes(3)
while ((Get-Date) -lt $deadline) {
    try {
        Invoke-WebRequest -Uri 'http://localhost:8080/api/auth/status' -UseBasicParsing -TimeoutSec 3 | Out-Null
        $backendReady = $true
        break
    } catch {
        Start-Sleep -Seconds 3
    }
}
if ($backendReady) {
    Write-Host '      后端已就绪：http://localhost:8080' -ForegroundColor Green
} else {
    Write-Warning '后端启动超时，请查看“Personal Hub Backend”窗口中的日志。'
}

# 4. 启动前端
Write-Host '[4/4] 启动前端（新窗口，端口 5173）...'
Start-Process -FilePath 'cmd.exe' -ArgumentList @(
    '/k',
    "title Personal Hub Frontend && cd /d `"$frontendDir`" && npm run dev:h5"
) | Out-Null

$frontendReady = $false
$deadline = (Get-Date).AddMinutes(2)
while ((Get-Date) -lt $deadline) {
    try {
        Invoke-WebRequest -Uri 'http://localhost:5173/' -UseBasicParsing -TimeoutSec 3 | Out-Null
        $frontendReady = $true
        break
    } catch {
        Start-Sleep -Seconds 2
    }
}
if ($frontendReady) {
    Write-Host '      前端已就绪：http://localhost:5173' -ForegroundColor Green
    Start-Process 'http://localhost:5173'
} else {
    Write-Warning '前端启动超时，请查看“Personal Hub Frontend”窗口中的日志。'
}

Write-Host ''
Write-Host '启动完成。关闭对应的命令行窗口即可停止服务。' -ForegroundColor Cyan
Write-Host '如需一次性停止全部服务，双击 stop-all.cmd。'
Write-Host ''
