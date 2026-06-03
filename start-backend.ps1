$ErrorActionPreference = 'Stop'

$cwd = $PSScriptRoot
$out = Join-Path $cwd 'server-dev.out.log'
$err = Join-Path $cwd 'server-dev.err.log'

Remove-Item -LiteralPath $out, $err -ErrorAction SilentlyContinue

Start-Process `
  -FilePath 'node.exe' `
  -ArgumentList @('.\node_modules\tsx\dist\cli.mjs', 'api\server.ts') `
  -WorkingDirectory $cwd `
  -RedirectStandardOutput $out `
  -RedirectStandardError $err `
  -WindowStyle Hidden
