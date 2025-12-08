import { initWindowIPCHandlers } from 'desktopSrc/lib/window'
import { initAzureAuthHandlers } from 'desktopSrc/lib/auth/azureAuth.handlers'
import { initAppHandlers } from './app.handlers'
import { initDialogHandlers } from './dialog.handlers'
import { initIPCHandlers } from './ipc.handlers'

export const initElectronHandlers = () => {
  initAppHandlers()
  initIPCHandlers()
  initDialogHandlers()
  initAzureAuthHandlers()

  initWindowIPCHandlers()
}
