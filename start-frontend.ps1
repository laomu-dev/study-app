$ErrorActionPreference = 'Stop'

$cwd = $PSScriptRoot
$out = Join-Path $cwd 'client-dev.out.log'
$err = Join-Path $cwd 'client-dev.err.log'

Remove-Item -LiteralPath $out, $err -ErrorAction SilentlyContinue

Start-Process `
  -FilePath 'npm.cmd' `
  -ArgumentList @('run', 'client:dev', '--', '--host', '0.0.0.0') `
  -WorkingDirectory $cwd `
  -RedirectStandardOutput $out `
  -RedirectStandardError $err `
  -WindowStyle Hidden
