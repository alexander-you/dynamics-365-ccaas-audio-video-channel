// =====================================================================================
// event-grid.bicep — ACS system topic + subscription delivering events to the Function.
// PHASE 3b scaffold. Not deployed by repo automation.
//
// Subscribes to ACS recording/call events and routes them to an Azure Function handler
// (handler implementation arrives in a later phase). The function name below is a placeholder.
// =====================================================================================

@description('Azure region.')
param location string

@description('Common tags.')
param tags object

@description('Event Grid system topic name.')
param systemTopicName string

@description('Resource ID of the ACS resource (system topic source).')
param acsResourceId string

@description('Resource ID of the Function App hosting the event handler.')
param functionAppId string

@description('Name of the function that handles ACS events (placeholder).')
param handlerFunctionName string = 'AcsEventHandler'

resource systemTopic 'Microsoft.EventGrid/systemTopics@2023-12-15-preview' = {
  name: systemTopicName
  location: location
  tags: tags
  properties: {
    source: acsResourceId
    topicType: 'Microsoft.Communication.CommunicationServices'
  }
}

resource eventSubscription 'Microsoft.EventGrid/systemTopics/eventSubscriptions@2023-12-15-preview' = {
  parent: systemTopic
  name: 'acv-recording-events'
  properties: {
    destination: {
      endpointType: 'AzureFunction'
      properties: {
        resourceId: '${functionAppId}/functions/${handlerFunctionName}'
        maxEventsPerBatch: 1
        preferredBatchSizeInKilobytes: 64
      }
    }
    filter: {
      includedEventTypes: [
        'Microsoft.Communication.RecordingFileStatusUpdated'
        'Microsoft.Communication.CallStarted'
        'Microsoft.Communication.CallEnded'
      ]
    }
    retryPolicy: {
      maxDeliveryAttempts: 30
      eventTimeToLiveInMinutes: 1440
    }
  }
}

output systemTopicId string = systemTopic.id
