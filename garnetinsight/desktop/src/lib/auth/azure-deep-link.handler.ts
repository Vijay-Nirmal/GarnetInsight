import { UrlWithParsedQuery } from 'url'
import log from 'electron-log'
import { AzureAuthService } from './azureAuth'
import { getWindows } from '../window/browserWindow'
import { IpcOnEvent } from 'uiSrc/electron/constants'
import { wrapErrorMessageSensitiveData } from 'desktopSrc/utils'

export const azureDeepLinkCallback = async (url: UrlWithParsedQuery) => {
  try {
    const code = url.query.code as string
    if (!code) {
      log.error('Azure deep link callback missing code')
      return
    }

    const azureAuthService = AzureAuthService.getInstance()
    const result = await azureAuthService.handleAuthCode(code)

    const [currentWindow] = getWindows().values()
    if (currentWindow) {
      currentWindow.webContents.send(IpcOnEvent.azureOauthCallback, result)
      currentWindow.show()
      currentWindow.focus()
    }
  } catch (e) {
    log.error(wrapErrorMessageSensitiveData(e as Error))
    const [currentWindow] = getWindows().values()
    if (currentWindow) {
      currentWindow.webContents.send(IpcOnEvent.azureOauthCallback, { error: e })
    }
  }
}
