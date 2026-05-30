#requires -Version 5.1
<#
.SYNOPSIS
    Generates (and by default only PRINTS) the Azure CLI commands needed to provision the
    Audio & Video Channel (ACV) infrastructure. PHASE 3b scaffold.

.DESCRIPTION
    This script is documentation-as-code. By default it performs NO provisioning: it prints
    the commands an administrator could review and run later. It does not connect to Azure,
    does not create resources, and does not run 'az deployment'.

    The naming convention matches docs/azure-resources.md and the Deployment Assistant:
        <type>-<prefix>-<env>-<region>[-nn]   (storage names strip dashes)

.PARAMETER Prefix
    Short workload prefix (e.g. acv).

.PARAMETER Environment
    Environment token: dev | test | prod.

.PARAMETER Region
    Azure region (e.g. westeurope).

.PARAMETER RegionShort
    Short region token used in names (e.g. weu).

.PARAMETER Execute
    SAFETY SWITCH. When omitted (default), commands are only printed. This script intentionally
    does NOT implement an execution path for provisioning; -Execute exists solely to make the
    "print only" default explicit and to fail loudly if someone expects auto-provisioning.

.EXAMPLE
    ./scripts/generate-azure-plan.ps1 -Prefix acv -Environment dev -Region westeurope -RegionShort weu
#>
[CmdletBinding()]
param(
    [string]$Prefix = 'acv',
    [ValidateSet('dev', 'test', 'prod')]
    [string]$Environment = 'dev',
    [string]$Region = 'westeurope',
    [string]$RegionShort = 'weu',
    [switch]$Execute
)

$ErrorActionPreference = 'Stop'

function Write-Section($title) {
    Write-Host ''
    Write-Host "# === $title ===" -ForegroundColor Cyan
}

$suffix = "$Prefix-$Environment-$RegionShort"
$rg = "rg-$suffix"
$acs = "acs-$suffix"
$func = "func-$suffix-01"
$plan = "plan-$suffix-01"
$funcStorage = ("st${Prefix}func${Environment}${RegionShort}01").ToLower()
$recStorage = ("st${Prefix}rec${Environment}${RegionShort}01").ToLower()
$kv = "kv-$suffix-01"

Write-Host 'ACV Azure provisioning plan (GENERATED — NOT EXECUTED)' -ForegroundColor Yellow
Write-Host '--------------------------------------------------------' -ForegroundColor Yellow
Write-Host 'This script prints commands for human review. No resources will be created.'
Write-Host "Resource group : $rg"
Write-Host "Region         : $Region"

Write-Section 'Step 1 — Create the resource group (admin action)'
Write-Host "az group create --name $rg --location $Region"

Write-Section 'Step 2 — Review the deployment with what-if (no changes)'
Write-Host "az deployment group what-if ``"
Write-Host "  --resource-group $rg ``"
Write-Host "  --template-file infra/bicep/main.bicep ``"
Write-Host "  --parameters infra/bicep/parameters/$Environment.bicepparam"

Write-Section 'Step 3 — Deploy (ONLY after explicit approval)'
Write-Host "az deployment group create ``"
Write-Host "  --resource-group $rg ``"
Write-Host "  --template-file infra/bicep/main.bicep ``"
Write-Host "  --parameters infra/bicep/parameters/$Environment.bicepparam"

Write-Section 'Planned resource names (for reference)'
Write-Host "ACS              : $acs"
Write-Host "Function App     : $func"
Write-Host "App plan         : $plan"
Write-Host "Functions storage: $funcStorage"
Write-Host "Recordings store : $recStorage"
Write-Host "Key Vault        : $kv"

Write-Section 'Cost & approval reminders'
Write-Host '- ACS, Function App, Storage, Log Analytics and Application Insights incur cost.'
Write-Host '- RBAC assignment requires Owner or User Access Administrator on the scope.'
Write-Host '- Do NOT commit real parameter files, secrets, tenant IDs or subscription IDs.'

if ($Execute) {
    Write-Host ''
    Write-Error 'This scaffold does not auto-provision. Remove -Execute and run the printed commands manually after approval.'
    exit 2
}

Write-Host ''
Write-Host 'Done. Commands printed only. Nothing was executed.' -ForegroundColor Green
