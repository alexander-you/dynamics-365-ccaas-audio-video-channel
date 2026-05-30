// =====================================================================================
// main.bicep — ACV (Audio & Video Channel) infrastructure entry point.
//
// PHASE 3b: SCAFFOLD ONLY. This template is NOT deployed by any automation in this repo.
// It is provided so that, once Azure provisioning is approved, an administrator can deploy
// the solution with a single, reviewable template. Review cost, naming, and RBAC first
// (see docs/azure-resources.md and docs/deployment-experience.md).
//
// Nothing here runs automatically. Helper scripts under /scripts only PRINT commands.
// =====================================================================================

targetScope = 'resourceGroup'

// ------------------------------------------------------------------------------------
// Parameters
// ------------------------------------------------------------------------------------
@description('Azure region for all resources. Example: westeurope')
param location string = resourceGroup().location

@description('Short workload/naming prefix. Lowercase alphanumeric, e.g. acv.')
@minLength(2)
@maxLength(10)
param prefix string = 'acv'

@description('Environment tag used in names and tags.')
@allowed([
  'dev'
  'test'
  'prod'
])
param environmentName string = 'dev'

@description('Short region token used in resource names, e.g. weu for westeurope.')
param regionShort string = 'weu'

@description('Provision Blob Storage for recordings (BYOS). MVP default true.')
param enableRecordingByos bool = true

@description('Provision Key Vault for secret references. Recommended.')
param useKeyVault bool = true

@description('ACS data location (governs where ACS stores data at rest). Validate with Microsoft.')
param acsDataLocation string = 'Europe'

@description('Common tags applied to all resources.')
param tags object = {
  workload: 'acv'
  environment: environmentName
  managedBy: 'bicep-scaffold'
  costCenter: 'TBD'
}

// ------------------------------------------------------------------------------------
// Naming — convention: <type>-<prefix>-<env>-<region>[-nn]
// Storage account names strip dashes (3-24 chars, lowercase alphanumeric).
// ------------------------------------------------------------------------------------
var suffix = '${prefix}-${environmentName}-${regionShort}'
var acsName = 'acs-${suffix}'
var funcName = 'func-${suffix}-01'
var funcStorageName = toLower(replace('st${prefix}func${environmentName}${regionShort}01', '-', ''))
var recStorageName = toLower(replace('st${prefix}rec${environmentName}${regionShort}01', '-', ''))
var appiName = 'appi-${suffix}'
var logName = 'log-${suffix}'
var kvName = 'kv-${suffix}-01'
var planName = 'plan-${suffix}-01'

// ------------------------------------------------------------------------------------
// Monitoring (Log Analytics + Application Insights) — created first; others depend on it.
// ------------------------------------------------------------------------------------
module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring'
  params: {
    location: location
    tags: tags
    logAnalyticsName: logName
    appInsightsName: appiName
  }
}

// ------------------------------------------------------------------------------------
// Storage — Functions runtime storage (+ optional recordings BYOS account/container).
// ------------------------------------------------------------------------------------
module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: {
    location: location
    tags: tags
    functionStorageName: funcStorageName
    recordingStorageName: recStorageName
    enableRecordingByos: enableRecordingByos
    recordingContainerName: 'recordings'
  }
}

// ------------------------------------------------------------------------------------
// Key Vault (optional) — for secret references, never raw secrets in app settings.
// ------------------------------------------------------------------------------------
module keyVault 'modules/key-vault.bicep' = if (useKeyVault) {
  name: 'keyVault'
  params: {
    location: location
    tags: tags
    keyVaultName: kvName
  }
}

// ------------------------------------------------------------------------------------
// Azure Communication Services — media foundation.
// ------------------------------------------------------------------------------------
module acs 'modules/communication-services.bicep' = {
  name: 'acs'
  params: {
    tags: tags
    acsName: acsName
    dataLocation: acsDataLocation
  }
}

// ------------------------------------------------------------------------------------
// Function App (token service + orchestration), .NET 8 isolated, system-assigned identity.
// ------------------------------------------------------------------------------------
module functionApp 'modules/function-app.bicep' = {
  name: 'functionApp'
  params: {
    location: location
    tags: tags
    functionAppName: funcName
    appServicePlanName: planName
    functionStorageName: funcStorageName
    appInsightsConnectionString: monitoring.outputs.appInsightsConnectionString
    acsEndpoint: acs.outputs.acsEndpoint
    recordingStorageAccountName: enableRecordingByos ? recStorageName : ''
    keyVaultUri: useKeyVault ? keyVault.outputs.keyVaultUri : ''
  }
  dependsOn: [
    storage
  ]
}

// ------------------------------------------------------------------------------------
// Event Grid — ACS system topic + subscription to the orchestration Function.
// ------------------------------------------------------------------------------------
module eventGrid 'modules/event-grid.bicep' = {
  name: 'eventGrid'
  params: {
    location: location
    tags: tags
    systemTopicName: 'evgt-${suffix}'
    acsResourceId: acs.outputs.acsResourceId
    functionAppId: functionApp.outputs.functionAppId
  }
}

// ------------------------------------------------------------------------------------
// RBAC — grant the Function App's managed identity least-privilege roles.
// Assignments are scoped in the rbac module. Requires Owner / User Access Administrator.
// ------------------------------------------------------------------------------------
module rbac 'modules/rbac.bicep' = {
  name: 'rbac'
  params: {
    functionAppPrincipalId: functionApp.outputs.principalId
    recordingStorageName: enableRecordingByos ? recStorageName : ''
    enableRecordingByos: enableRecordingByos
    keyVaultName: useKeyVault ? kvName : ''
    useKeyVault: useKeyVault
  }
}

// ------------------------------------------------------------------------------------
// Outputs (non-secret). The App Insights connection string is sensitive — handle via Key Vault.
// ------------------------------------------------------------------------------------
output acsEndpoint string = acs.outputs.acsEndpoint
output functionAppName string = functionApp.outputs.functionAppName
output functionAppPrincipalId string = functionApp.outputs.principalId
output recordingStorageAccount string = enableRecordingByos ? recStorageName : ''
output keyVaultUri string = useKeyVault ? keyVault.outputs.keyVaultUri : ''
