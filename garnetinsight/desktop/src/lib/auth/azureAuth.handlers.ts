import { ipcMain } from 'electron'
import { IpcInvokeEvent } from 'uiSrc/electron/constants'
import { AzureAuthService } from './azureAuth'

export const initAzureAuthHandlers = () => {
  const azureAuthService = AzureAuthService.getInstance()

  ipcMain.handle(IpcInvokeEvent.azureStartDeviceLogin, async () => {
    return azureAuthService.startLogin()
  })

  ipcMain.handle(IpcInvokeEvent.azureGetCosmosToken, async () => {
    return azureAuthService.getCosmosAccessToken()
  })
}
