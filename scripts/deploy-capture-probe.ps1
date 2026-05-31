# Deploys alex_acv_capture_probe.html as an HTML web resource into the
# alex_visual_engagement_channel solution in Demo Contact Center EN, then publishes it.
# Reversible: delete the web resource to roll back. No other components touched.
param(
  [string]$DvUrl = "https://demo-contact-center-en.crm4.dynamics.com",
  [string]$Solution = "alex_visual_engagement_channel",
  [string]$WrName = "alex_acv_capture_probe.html",
  [string]$HtmlPath = "$PSScriptRoot/../dataverse/webresources/alex_acv_capture_probe.html"
)
$ErrorActionPreference = "Stop"

$tok = az account get-access-token --resource $DvUrl --query accessToken -o tsv
$h = @{
  Authorization      = "Bearer $tok"
  "OData-MaxVersion" = "4.0"
  "OData-Version"    = "4.0"
  Accept             = "application/json"
}

# 1. Confirm solution
$f = [System.Web.HttpUtility]::UrlEncode("uniquename eq '$Solution'")
$solUri = "$DvUrl/api/data/v9.2/solutions?`$filter=uniquename eq '$Solution'&`$select=uniquename,ismanaged"
$sol = Invoke-RestMethod -Method Get -Headers $h -Uri $solUri
if (-not $sol.value -or $sol.value.Count -eq 0) { throw "Solution '$Solution' not found." }
Write-Host "Solution OK: $($sol.value[0].uniquename) managed=$($sol.value[0].ismanaged)"

# 2. Does the web resource already exist?
$wrUri = "$DvUrl/api/data/v9.2/webresourceset?`$filter=name eq '$WrName'&`$select=webresourceid,name"
$existing = Invoke-RestMethod -Method Get -Headers $h -Uri $wrUri

# 3. Encode HTML
$bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $HtmlPath))
$b64 = [System.Convert]::ToBase64String($bytes)

$body = @{
  name           = $WrName
  displayname    = "ACV camera/mic capture probe (diagnostic)"
  description    = "Diagnostic-only same-origin capture probe. No ACS, no Dataverse writes, no storage, no tokens. Safe to delete."
  webresourcetype = 1   # 1 = Webpage (HTML)
  content        = $b64
} | ConvertTo-Json

$postHeaders = $h.Clone()
$postHeaders["Content-Type"] = "application/json; charset=utf-8"
$postHeaders["MSCRM.SolutionUniqueName"] = $Solution

if ($existing.value -and $existing.value.Count -gt 0) {
  $id = $existing.value[0].webresourceid
  Write-Host "Web resource exists ($id) — updating content."
  $patchUri = "$DvUrl/api/data/v9.2/webresourceset($id)"
  Invoke-RestMethod -Method Patch -Headers $postHeaders -Uri $patchUri -Body $body | Out-Null
} else {
  Write-Host "Creating web resource '$WrName' in solution '$Solution'."
  Invoke-RestMethod -Method Post -Headers $postHeaders -Uri "$DvUrl/api/data/v9.2/webresourceset" -Body $body | Out-Null
}

# Always (re)resolve the id by name — robust against header-casing differences.
$lookup = Invoke-RestMethod -Method Get -Headers $h -Uri $wrUri
if (-not $lookup.value -or $lookup.value.Count -eq 0) { throw "Web resource '$WrName' not found after upsert." }
$id = $lookup.value[0].webresourceid
Write-Host "Web resource id: $id"

# 4. Publish
$publishBody = @{ ParameterXml = "<importexportxml><webresources><webresource>{$id}</webresource></webresources></importexportxml>" } | ConvertTo-Json
$pubHeaders = $h.Clone()
$pubHeaders["Content-Type"] = "application/json; charset=utf-8"
Invoke-RestMethod -Method Post -Headers $pubHeaders -Uri "$DvUrl/api/data/v9.2/PublishXml" -Body $publishBody | Out-Null
Write-Host "Published."

Write-Host ""
Write-Host "WEBRESOURCE_ID=$id"
Write-Host "TEST_URL=$DvUrl/WebResources/$WrName"
