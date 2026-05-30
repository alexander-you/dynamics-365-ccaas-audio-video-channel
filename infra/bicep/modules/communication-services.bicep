// =====================================================================================
// communication-services.bicep — Azure Communication Services resource.
// PHASE 3b scaffold. Not deployed by repo automation.
//
// ACS is a global resource (location 'global'); dataLocation governs data residency.
// Validate Call Recording / transcription regional availability with Microsoft.
// =====================================================================================

@description('Common tags.')
param tags object

@description('ACS resource name.')
param acsName string

@description('ACS data location (data residency). Validate with Microsoft.')
@allowed([
  'Africa'
  'Asia Pacific'
  'Australia'
  'Brazil'
  'Canada'
  'Europe'
  'France'
  'Germany'
  'India'
  'Japan'
  'Korea'
  'Norway'
  'Switzerland'
  'UAE'
  'UK'
  'United States'
])
param dataLocation string = 'Europe'

resource acs 'Microsoft.Communication/communicationServices@2023-04-01' = {
  name: acsName
  location: 'global'
  tags: tags
  properties: {
    dataLocation: dataLocation
  }
}

output acsResourceId string = acs.id
output acsName string = acs.name

@description('ACS endpoint host (no key). Tokens are minted server-side via Managed Identity.')
output acsEndpoint string = 'https://${acs.properties.hostName}'
