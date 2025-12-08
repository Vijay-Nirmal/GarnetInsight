import log from 'electron-log'
import { UrlWithParsedQuery } from 'url'
import { cloudOauthCallback } from 'desktopSrc/lib/cloud/cloud-oauth.handlers'
import { azureDeepLinkCallback } from 'desktopSrc/lib/auth/azure-deep-link.handler'

export const cloudDeepLinkHandler = async (url: UrlWithParsedQuery) => {
  switch (url?.pathname) {
    case '/oauth/callback':
      await cloudOauthCallback(url)
      break
    case '/azure/oauth/callback':
      await azureDeepLinkCallback(url)
      break
    default:
      log.warn('Unknown cloud deep link pathname', url?.pathname)
  }
}
