#requires -Version 5.1
<#
.SYNOPSIS
    Validates that local tooling required to build and (eventually) deploy the ACV solution
    is present and at a compatible version. PHASE 3b scaffold — READ-ONLY checks.

.DESCRIPTION
    This script only INSPECTS the local environment. It does not log into Azure, does not
    create or modify any resource, and does not run 'az deployment'. It reports tool presence
    and versions so an administrator can confirm prerequisites before an approved deployment.

    Checked tools:
        - Azure CLI (az)         optional but recommended for deployment
        - Bicep CLI (az bicep)   optional, for compiling/linting templates
        - .NET SDK 8             required to build src/token-service
        - Node.js 18+            required to build the web apps
        - GitHub CLI (gh)        optional, for PR workflows

.EXAMPLE
    ./scripts/validate-prerequisites.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Continue'
$results = @()

function Test-Tool {
    param(
        [string]$Name,
        [string]$Command,
        [string[]]$VersionArgs,
        [string]$MinHint,
        [bool]$Required
    )
    $cmd = Get-Command $Command -ErrorAction SilentlyContinue
    if (-not $cmd) {
        return [pscustomobject]@{
            Tool = $Name; Found = $false; Version = ''; Required = $Required; Hint = $MinHint
        }
    }
    $version = ''
    try {
        $version = (& $Command @VersionArgs 2>$null | Select-Object -First 1)
    } catch {
        $version = '(version check failed)'
    }
    [pscustomobject]@{
        Tool = $Name; Found = $true; Version = "$version".Trim(); Required = $Required; Hint = $MinHint
    }
}

Write-Host 'ACV prerequisite validation (READ-ONLY — no Azure calls)' -ForegroundColor Yellow
Write-Host '--------------------------------------------------------' -ForegroundColor Yellow

$results += Test-Tool -Name 'Azure CLI'   -Command 'az'     -VersionArgs @('version','--query','"azure-cli"','-o','tsv') -MinHint '>= 2.50' -Required $false
$results += Test-Tool -Name 'Bicep CLI'   -Command 'bicep'  -VersionArgs @('--version')        -MinHint '>= 0.24'  -Required $false
$results += Test-Tool -Name '.NET SDK'    -Command 'dotnet' -VersionArgs @('--version')        -MinHint '8.0.x'    -Required $true
$results += Test-Tool -Name 'Node.js'     -Command 'node'   -VersionArgs @('--version')        -MinHint '>= 18'    -Required $true
$results += Test-Tool -Name 'GitHub CLI'  -Command 'gh'     -VersionArgs @('--version')        -MinHint '>= 2.40'  -Required $false

$results | Format-Table -AutoSize Tool, Found, Version, Required, Hint

$missingRequired = $results | Where-Object { $_.Required -and -not $_.Found }
if ($missingRequired) {
    Write-Host ''
    Write-Host 'Missing REQUIRED tools:' -ForegroundColor Red
    $missingRequired | ForEach-Object { Write-Host " - $($_.Tool) ($($_.Hint))" -ForegroundColor Red }
    exit 1
}

Write-Host ''
Write-Host 'All required tools present. Optional tools are recommended for deployment.' -ForegroundColor Green
Write-Host 'Note: this script performed no Azure operations.' -ForegroundColor Green
