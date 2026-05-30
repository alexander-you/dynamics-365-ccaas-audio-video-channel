// =====================================================================================
// storage.bicep — Functions runtime storage + optional recordings BYOS account/container.
// PHASE 3b scaffold. Not deployed by repo automation.
//
// Security posture (MVP): TLS 1.2 min, no public blob access, key access kept for the
// Functions runtime account; recordings account is intended for Managed Identity access.
// Production hardening (private endpoints, CMK, immutability, lifecycle) is documented
// separately and NOT included here.
// =====================================================================================

@description('Azure region.')
param location string

@description('Common tags.')
param tags object

@description('Functions runtime storage account name (3-24 lowercase alphanumeric).')
@minLength(3)
@maxLength(24)
param functionStorageName string

@description('Recordings BYOS storage account name (3-24 lowercase alphanumeric).')
@minLength(3)
@maxLength(24)
param recordingStorageName string

@description('Whether to create the recordings BYOS account + container.')
param enableRecordingByos bool

@description('Blob container name for recordings.')
param recordingContainerName string = 'recordings'

resource functionStorage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: functionStorageName
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
  }
}

resource recordingStorage 'Microsoft.Storage/storageAccounts@2023-05-01' = if (enableRecordingByos) {
  name: recordingStorageName
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
    // Recommend disabling shared-key access in production and using Managed Identity only.
    allowSharedKeyAccess: true
  }
}

resource recordingBlobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = if (enableRecordingByos) {
  parent: recordingStorage
  name: 'default'
  properties: {
    deleteRetentionPolicy: {
      enabled: true
      days: 7
    }
  }
}

resource recordingContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = if (enableRecordingByos) {
  parent: recordingBlobService
  name: recordingContainerName
  properties: {
    publicAccess: 'None'
  }
}

output functionStorageId string = functionStorage.id
output recordingStorageId string = enableRecordingByos ? recordingStorage.id : ''
output recordingContainerName string = enableRecordingByos ? recordingContainerName : ''
