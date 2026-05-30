// =====================================================================================
// function-app.bicep — Function App (.NET 8 isolated) + plan, system-assigned identity.
// PHASE 3b scaffold. Not deployed by repo automation.
//
// App settings use placeholders. USE_MOCKS defaults to 'false' here because IaC implies a
// real deployment — but the real (non-mock) service implementations land in a later phase,
// so do not flip production traffic on until those are ready and approved.
// =====================================================================================

@description('Azure region.')
param location string

@description('Common tags.')
param tags object

@description('Function App name.')
param functionAppName string

@description('App Service / Functions plan name.')
param appServicePlanName string

@description('Functions runtime storage account name.')
param functionStorageName string

@description('Application Insights connection string (sensitive).')
@secure()
param appInsightsConnectionString string

@description('ACS endpoint (no key).')
param acsEndpoint string

@description('Recordings storage account name (empty when BYOS disabled).')
param recordingStorageAccountName string = ''

@description('Key Vault URI (empty when Key Vault disabled).')
param keyVaultUri string = ''

resource functionStorage 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: functionStorageName
}

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  tags: tags
  sku: {
    // Consumption (Y1). Consider Flex Consumption / EP1 for VNET + no cold start in production.
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {}
}

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  tags: tags
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      netFrameworkVersion: 'v8.0'
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          // Prefer identity-based connection in production; key-based shown for scaffold simplicity.
          value: 'DefaultEndpointsProtocol=https;AccountName=${functionStorageName};EndpointSuffix=${environment().suffixes.storage};AccountKey=${functionStorage.listKeys().keys[0].value}'
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'dotnet-isolated'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsightsConnectionString
        }
        {
          name: 'USE_MOCKS'
          // Real services arrive in a later phase; keep true until they are wired & approved.
          value: 'true'
        }
        {
          name: 'ACS_ENDPOINT'
          value: acsEndpoint
        }
        {
          name: 'ACS_USE_MANAGED_IDENTITY'
          value: 'true'
        }
        {
          name: 'TOKEN_TTL_MINUTES'
          value: '60'
        }
        {
          name: 'RECORDING_STORAGE_MODE'
          value: 'AzureBlobBYOS'
        }
        {
          name: 'RECORDINGS_STORAGE_ACCOUNT'
          value: recordingStorageAccountName
        }
        {
          name: 'RECORDINGS_CONTAINER'
          value: 'recordings'
        }
        {
          name: 'RECORDINGS_STORAGE_AUTH'
          value: 'ManagedIdentity'
        }
        {
          name: 'KEYVAULT_URI'
          value: keyVaultUri
        }
        {
          name: 'DATAVERSE_URL'
          // Left blank until Dynamics 365 / Phase 5 approval.
          value: ''
        }
      ]
    }
  }
}

output functionAppId string = functionApp.id
output functionAppName string = functionApp.name
output principalId string = functionApp.identity.principalId
output defaultHostName string = functionApp.properties.defaultHostName
