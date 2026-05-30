// =====================================================================================
// monitoring.bicep — Log Analytics workspace + workspace-based Application Insights.
// PHASE 3b scaffold. Not deployed by repo automation.
// =====================================================================================

@description('Azure region.')
param location string

@description('Common tags.')
param tags object

@description('Log Analytics workspace name.')
param logAnalyticsName string

@description('Application Insights component name.')
param appInsightsName string

@description('Log retention in days.')
@minValue(30)
@maxValue(730)
param retentionInDays int = 30

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: retentionInDays
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    // Ingestion is cost-driving; control with sampling in host.json.
    IngestionMode: 'LogAnalytics'
  }
}

output logAnalyticsId string = logAnalytics.id
output appInsightsId string = appInsights.id

@description('Sensitive: prefer storing/consuming via Key Vault reference.')
output appInsightsConnectionString string = appInsights.properties.ConnectionString
