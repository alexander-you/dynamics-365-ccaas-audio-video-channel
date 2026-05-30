// =====================================================================================
// dev.example.bicepparam — EXAMPLE parameters for main.bicep (dev environment).
// PHASE 3b scaffold. Contains NO real tenant/subscription values. Copy to a private,
// git-ignored *.bicepparam (e.g. dev.bicepparam) and adjust before any approved deployment.
// =====================================================================================

using '../main.bicep'

param location = 'westeurope'
param prefix = 'acv'
param environmentName = 'dev'
param regionShort = 'weu'
param enableRecordingByos = true
param useKeyVault = true
param acsDataLocation = 'Europe'
param tags = {
  workload: 'acv'
  environment: 'dev'
  managedBy: 'bicep-scaffold'
  costCenter: 'TBD'
}
