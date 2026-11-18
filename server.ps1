param(
    [int]$Port = 8080
)

$ErrorActionPreference = 'Stop'
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DataFile = Join-Path $RootDir 'data.json'

function Get-MimeType([string]$Path) {
    switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
        '.html' { return 'text/html; charset=utf-8' }
        '.css'  { return 'text/css; charset=utf-8' }
        '.js'   { return 'application/javascript; charset=utf-8' }
        '.json' { return 'application/json; charset=utf-8' }
        '.svg'  { return 'image/svg+xml' }
        '.png'  { return 'image/png' }
        '.ico'  { return 'image/x-icon' }
        default { return 'application/octet-stream' }
    }
}

function Send-HttpResponse(
    [System.Net.Sockets.NetworkStream]$Stream,
    [int]$StatusCode,
    [string]$StatusText,
    [string]$ContentType,
    [byte[]]$BodyBytes
) {
    $headers = @(
        "HTTP/1.1 $StatusCode $StatusText"
        "Content-Type: $ContentType"
        "Content-Length: $($BodyBytes.Length)"
        "Cache-Control: no-store"
        "Connection: close"
        ""
        ""
    ) -join "`r`n"

    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
    $Stream.Write($headerBytes, 0, $headerBytes.Length)
    if ($BodyBytes.Length -gt 0) {
        $Stream.Write($BodyBytes, 0, $BodyBytes.Length)
    }
    $Stream.Flush()
}

function Read-HttpRequest([System.Net.Sockets.NetworkStream]$Stream) {
    $buffer = New-Object byte[] 8192
    $ms = New-Object System.IO.MemoryStream
    $headerEndIndex = -1

    while ($true) {
        $bytesRead = $Stream.Read($buffer, 0, $buffer.Length)
        if ($bytesRead -le 0) { break }
        $ms.Write($buffer, 0, $bytesRead)

        $arr = $ms.ToArray()
        $text = [System.Text.Encoding]::ASCII.GetString($arr)
        $idx = $text.IndexOf("`r`n`r`n")
        if ($idx -ge 0) {
            $headerEndIndex = $idx
            break
        }
        if ($arr.Length -gt 65536) { break }
    }

    if ($headerEndIndex -lt 0) {
        return $null
    }

    $allBytes = $ms.ToArray()
    $headerText = [System.Text.Encoding]::ASCII.GetString($allBytes, 0, $headerEndIndex)
    $headerLines = $headerText -split "`r`n"
    $requestLine = $headerLines[0].Split(' ')
    $method = $requestLine[0].ToUpperInvariant()
    $rawPath = if ($requestLine.Length -ge 2) { $requestLine[1] } else { '/' }

    $contentLength = 0
    foreach ($line in $headerLines | Select-Object -Skip 1) {
        if ($line -match '^\s*Content-Length\s*:\s*(\d+)\s*$') {
            $contentLength = [int]$Matches[1]
        }
    }

    $bodyStart = $headerEndIndex + 4
    $bodyStream = New-Object System.IO.MemoryStream
    if ($allBytes.Length -gt $bodyStart) {
        $bodyStream.Write($allBytes, $bodyStart, $allBytes.Length - $bodyStart)
    }

    while ($bodyStream.Length -lt $contentLength) {
        $remaining = $contentLength - [int]$bodyStream.Length
        $toRead = [Math]::Min($buffer.Length, $remaining)
        $bytesRead = $Stream.Read($buffer, 0, $toRead)
        if ($bytesRead -le 0) { break }
        $bodyStream.Write($buffer, 0, $bytesRead)
    }

    $bodyBytes = $bodyStream.ToArray()
    if ($contentLength -gt 0 -and $bodyBytes.Length -gt $contentLength) {
        $trimmed = New-Object byte[] $contentLength
        [Array]::Copy($bodyBytes, 0, $trimmed, 0, $contentLength)
        $bodyBytes = $trimmed
    }

    return @{
        Method = $method
        Path   = ($rawPath -split '\?')[0]
        Body   = $bodyBytes
    }
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
$listener.Start()

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  PC Profit - Web App Server Running" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  On this PC:        http://localhost:$Port"
try {
    $ips = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
        Where-Object { $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and -not [System.Net.IPAddress]::IsLoopback($_) } |
        Select-Object -ExpandProperty IPAddressToString
    foreach ($ip in $ips) {
        Write-Host "  On phone (Wi-Fi):  http://${ip}:$Port" -ForegroundColor Yellow
    }
} catch {}
Write-Host "  Press Ctrl+C to stop the server." -ForegroundColor DarkGray
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $client.ReceiveTimeout = 10000
            $client.SendTimeout = 10000
            $stream = $client.GetStream()
            $req = Read-HttpRequest $stream
            if ($null -eq $req) { continue }

            $reqPath = [Uri]::UnescapeDataString($req.Path)

            if ($reqPath -eq '/api/data') {
                if ($req.Method -eq 'GET') {
                    if (Test-Path -LiteralPath $DataFile) {
                        $bytes = [System.IO.File]::ReadAllBytes($DataFile)
                    } else {
                        $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"empty":true}')
                    }
                    Send-HttpResponse $stream 200 'OK' 'application/json; charset=utf-8' $bytes
                }
                elseif ($req.Method -eq 'POST') {
                    [System.IO.File]::WriteAllBytes($DataFile, $req.Body)
                    $okBytes = [System.Text.Encoding]::UTF8.GetBytes('{"ok":true}')
                    Send-HttpResponse $stream 200 'OK' 'application/json; charset=utf-8' $okBytes
                }
                else {
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Method not allowed"}')
                    Send-HttpResponse $stream 405 'Method Not Allowed' 'application/json; charset=utf-8' $errBytes
                }
                continue
            }

            if ($reqPath -eq '/') {
                $reqPath = '/index.html'
            }

            $relPath = $reqPath.TrimStart('/').Replace('/', '\')
            $fullPath = [System.IO.Path]::GetFullPath((Join-Path $RootDir $relPath))
            $fullRoot = [System.IO.Path]::GetFullPath($RootDir)

            if (-not $fullPath.StartsWith($fullRoot, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
                $notFound = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
                Send-HttpResponse $stream 404 'Not Found' 'text/plain; charset=utf-8' $notFound
                continue
            }

            $fileBytes = [System.IO.File]::ReadAllBytes($fullPath)
            $mime = Get-MimeType $fullPath
            Send-HttpResponse $stream 200 'OK' $mime $fileBytes
        } catch {
            # Ignore client socket errors
        } finally {
            $client.Close()
        }
    }
} finally {
    $listener.Stop()
}
