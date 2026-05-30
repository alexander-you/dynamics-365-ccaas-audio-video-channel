// =====================================================================================
// key-vault.bicep — Key Vault for secret references (RBAC authorization model).
// PHASE 3b scaffold. Not deployed by repo automation.
//
// No secrets are created here. Secret values are added out-of-band by an administrator,
// never committed to Git. The Function App identity is granted access via rbac.bicep.
// =====================================================================================

@description('Azure region.')
param location string

@description('Common tags.')
param tags object

@description('Key Vault name (3-24 chars).')
@minLength(3)
@maxLength(24)
param keyVaultName string

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    publicNetworkAccess: 'Enabled' // Restrict / private endpoint in production.
  }
}

output keyVaultId string = keyVault.id
output keyVaultUri string = keyVault.properties.vaultUri
