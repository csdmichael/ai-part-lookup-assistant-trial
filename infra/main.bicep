@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('Short environment name, used in resource names.')
param environmentName string = 'dev'

@description('Base name for the workload.')
param workloadName string = 'part-lookup'

@description('App Service plan SKU. B1 is sufficient for the Dev trial environment.')
param appServicePlanSku string = 'B1'

@description('Browser origins allowed to call the API. Same-host deployments do not need any.')
param allowedOrigins string = ''

var resourceSuffix = '${workloadName}-${environmentName}-${uniqueString(resourceGroup().id)}'

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-${resourceSuffix}'
  location: location
  properties: {
    retentionInDays: 30
    sku: {
      name: 'PerGB2018'
    }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-${resourceSuffix}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: 'plan-${resourceSuffix}'
  location: location
  sku: {
    name: appServicePlanSku
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: 'app-${resourceSuffix}'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
      healthCheckPath: '/api/health'
      appCommandLine: 'node dist/server.js'
      appSettings: [
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'PORT'
          value: '8080'
        }
        {
          name: 'STATIC_DIR'
          value: '/home/site/wwwroot/wwwroot'
        }
        {
          // /home is the persistent volume on App Service, so the SQLite file survives restarts.
          name: 'DATABASE_FILE'
          value: '/home/data/part-lookup.sqlite'
        }
        {
          name: 'ALLOWED_ORIGINS'
          value: allowedOrigins
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'false'
        }
      ]
    }
  }
}

output webAppName string = webApp.name
output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
