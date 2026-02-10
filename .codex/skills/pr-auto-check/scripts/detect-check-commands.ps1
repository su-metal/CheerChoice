param(
  [string]$PackageJsonPath = "package.json"
)

if (-not (Test-Path $PackageJsonPath)) {
  Write-Error "package.json not found at $PackageJsonPath"
  exit 1
}

$pkg = Get-Content -Path $PackageJsonPath -Raw | ConvertFrom-Json
$scripts = @{}
if ($pkg.scripts) {
  $pkg.scripts.PSObject.Properties | ForEach-Object {
    $scripts[$_.Name] = $_.Value
  }
}

$commands = @()
$commands += "npm ci"

if ($scripts.ContainsKey("typecheck")) {
  $commands += "npm run typecheck"
} elseif (Test-Path "tsconfig.json") {
  $commands += "npx tsc --noEmit"
}

if ($scripts.ContainsKey("lint")) {
  $commands += "npm run lint"
}

if ($scripts.ContainsKey("test")) {
  $commands += "npm test"
}

if ($scripts.ContainsKey("build")) {
  $commands += "npm run build"
}

$commands | ForEach-Object { Write-Output $_ }
