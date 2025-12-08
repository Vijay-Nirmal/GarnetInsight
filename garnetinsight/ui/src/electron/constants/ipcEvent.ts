enum IpcInvokeEvent {
  getStoreValue = 'store:get:value',
  deleteStoreValue = 'store:delete:value',
  getAppVersion = 'app:get:version',
  cloudOauth = 'cloud:oauth',
  windowOpen = 'window:open',
  themeChange = 'theme:change',
  appRestart = 'app:restart',
  azureStartDeviceLogin = 'azure:start:device:login',
  azurePollForToken = 'azure:poll:for:token',
  azureGetCosmosToken = 'azure:get:cosmos:token',
}

enum IpcOnEvent {
  sendWindowId = 'window:send:id',
  cloudOauthCallback = 'cloud:oauth:callback',
  azureOauthCallback = 'azure:oauth:callback',
  deepLinkAction = 'deep-link:action',
  appUpdateAvailable = 'app:update:available',
}

export { IpcInvokeEvent, IpcOnEvent }
