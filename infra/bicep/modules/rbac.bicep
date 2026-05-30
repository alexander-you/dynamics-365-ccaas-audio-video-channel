// =====================================================================================
// rbac.bicep — Least-privilege role assignments for the Function App managed identity.
// PHASE 3b scaffold. Not deployed by repo automation.
//
// Deploying RBAC requires the deployer to have Owner or User Access Administrator on the
// target scope. Roles granted:
//   - Storage Blob Data Contributor  -> recordings storage (BYOS read/write)  [if enabled]
//   - Key Vault Secrets User         -> Key Vault (read secret values)         [if enabled]
// ACS role assignment (Communication and Email Service Owner / Contributor) for token
// minting via Managed Identity is documented in docs/azure-resources.md and should be
// granted on the ACS resource scope by an administrator.
// =====================================================================================

@description('Principal (object) ID of the Function App system-assigned identity.')
param functionAppPrincipalId string

@description('Recordings storage account name (empty when BYOS disabled).')
param recordingStorageName string = ''

@description('Whether recordings BYOS is enabled.')
param enableRecordingByos bool

@description('Key Vault name (empty when Key Vault disabled).')
param keyVaultName string = ''

@description('Whether Key Vault is enabled.')
param useKeyVault bool

// Built-in role definition IDs (stable GUIDs).
var storageBlobDataContributorRoleId = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
var keyVaultSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

resource recordingStorage 'Microsoft.Storage/storageAccounts@2023-05-01' existing = if (enableRecordingByos) {
  name: recordingStorageName
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = if (useKeyVault) {
  name: keyVaultName
}

resource storageBlobRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (enableRecordingByos) {
  name: guid(recordingStorageName, functionAppPrincipalId, storageBlobDataContributorRoleId)
  scope: recordingStorage
  properties: {
    principalId: functionAppPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataContributorRoleId)
  }
}

resource kvSecretsRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (useKeyVault) {
  name: guid(keyVaultName, functionAppPrincipalId, keyVaultSecretsUserRoleId)
  scope: keyVault
  properties: {
    principalId: functionAppPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsUserRoleId)
  }
}
