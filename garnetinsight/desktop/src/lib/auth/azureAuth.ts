import {
  PublicClientApplication,
  AuthenticationResult,
  AccountInfo,
  AuthorizationCodeRequest,
  CryptoProvider,
} from '@azure/msal-node'
import { shell } from 'electron'
import * as http from 'http'
import { AddressInfo } from 'net'

const AZURE_CLI_CLIENT_ID = 'fdf090fe-ea78-471b-8678-8ea1545573f4' // Azure CLI
const TENANT_ID = 'common' // or 'organizations'

export class AzureAuthService {
  private static instance: AzureAuthService

  private pca: PublicClientApplication

  private cryptoProvider: CryptoProvider

  private account: AccountInfo | null = null

  private managementToken: string | null = null

  private pkceCodes: { verifier: string; challenge: string } | null = null

  private constructor() {
    this.pca = new PublicClientApplication({
      auth: {
        clientId: AZURE_CLI_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${TENANT_ID}`,
      },
    })
    this.cryptoProvider = new CryptoProvider()
  }

  public static getInstance(): AzureAuthService {
    if (!AzureAuthService.instance) {
      AzureAuthService.instance = new AzureAuthService()
    }
    return AzureAuthService.instance
  }

  public getManagementToken(): string | null {
    return this.managementToken
  }

  public async startLogin(): Promise<AuthenticationResult> {
    const { verifier, challenge } =
      await this.cryptoProvider.generatePkceCodes()
    this.pkceCodes = { verifier, challenge }

    // Start a local server to listen for the auth code
    const server = http.createServer()

    return new Promise<AuthenticationResult>((resolve, reject) => {
      server.on('request', async (req, res) => {
        const url = new URL(req.url!, 'http://localhost')
        if (url.pathname === '/callback') {
          const code = url.searchParams.get('code')
          const error = url.searchParams.get('error')
          const errorDescription = url.searchParams.get('error_description')

          if (code) {
            try {
              const redirectUri = `http://localhost:${(server.address() as AddressInfo).port}/callback`
              const result = await this.handleAuthCode(code, redirectUri)
              res.writeHead(200, { 'Content-Type': 'text/html' })
              res.end(
                '<h1>Authentication successful! You can close this window.</h1><script>window.close()</script>',
              )
              resolve(result)
            } catch (e) {
              res.writeHead(500)
              res.end('Error during authentication')
              reject(e)
            } finally {
              server.close()
            }
          } else if (error) {
            res.writeHead(400)
            res.end(`Authentication failed: ${errorDescription}`)
            server.close()
            reject(new Error(`${error}: ${errorDescription}`))
          }
        }
      })

      server.listen(0, '127.0.0.1', async () => {
        const port = (server.address() as AddressInfo).port
        const redirectUri = `http://localhost:${port}/callback`

        const authCodeUrlParameters = {
          scopes: [
            'https://management.azure.com/user_impersonation',
            'https://cosmos.azure.com/user_impersonation',
            'offline_access',
          ],
          redirectUri,
          codeChallenge: challenge,
          codeChallengeMethod: 'S256',
          prompt: 'select_account',
        }

        try {
          const authCodeUrl = await this.pca.getAuthCodeUrl(
            authCodeUrlParameters,
          )
          await shell.openExternal(authCodeUrl)
        } catch (e) {
          server.close()
          reject(e)
        }
      })
    })
  }

  public async handleAuthCode(
    code: string,
    redirectUri: string,
  ): Promise<AuthenticationResult> {
    if (!this.pkceCodes) {
      throw new Error('PKCE codes not found. Start login first.')
    }

    const tokenRequest: AuthorizationCodeRequest = {
      code,
      redirectUri,
      scopes: [
        'https://management.azure.com/user_impersonation',
        'offline_access',
      ],
      codeVerifier: this.pkceCodes.verifier,
    }

    const result = await this.pca.acquireTokenByCode(tokenRequest)
    if (result) {
      this.managementToken = result.accessToken
      this.account = result.account
    }
    return result
  }

  public async getCosmosAccessToken(): Promise<string> {
    if (!this.account) {
      throw new Error('No account available. Please login first.')
    }

    const result = await this.pca.acquireTokenSilent({
      account: this.account,
      scopes: ['https://cosmos.azure.com/user_impersonation'],
    })

    if (!result) {
      throw new Error('Failed to get cosmos access token')
    }

    return result.accessToken
  }
}
