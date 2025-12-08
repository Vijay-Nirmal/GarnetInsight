
import { IpcInvokeEvent } from 'uiSrc/electron/constants'

export interface AzureTokenResponse {
  token_type: string
  scope: string
  expires_in: number
  access_token: string
  refresh_token?: string
  id_token?: string
}

export interface DeviceCodeResponse {
  user_code: string
  device_code: string
  verification_uri: string
  expires_in: number
  interval: number
  message: string
}

export class AzureService {
  private static instance: AzureService

  private managementToken: string | null = null

  private constructor() {
    // Singleton
  }

  public static getInstance(): AzureService {
    if (!AzureService.instance) {
      AzureService.instance = new AzureService()
    }
    return AzureService.instance
  }

  public getManagementToken(): string | null {
    return this.managementToken
  }

  public setManagementToken(token: string) {
    this.managementToken = token
  }

  public async startDeviceLogin(): Promise<AzureTokenResponse> {
    return window.app.ipc.invoke(IpcInvokeEvent.azureStartDeviceLogin)
  }

  public async pollForToken(
    code: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _interval: number,
  ): Promise<AzureTokenResponse> {
    const result = await window.app.ipc.invoke(
      IpcInvokeEvent.azurePollForToken,
      code,
    )
    this.managementToken = result.accessToken
    return result
  }

  public async getCosmosAccessToken(): Promise<string> {
    return window.app.ipc.invoke(IpcInvokeEvent.azureGetCosmosToken)
  }

  public async listSubscriptions() {
    if (!this.managementToken) throw new Error('Not authenticated')
    const response = await fetch(
      'https://management.azure.com/subscriptions?api-version=2020-01-01',
      {
        headers: {
          Authorization: `Bearer ${this.managementToken}`,
        },
      },
    )
    if (!response.ok) throw new Error('Failed to list subscriptions')
    return response.json()
  }

  public async listResourceGroups(subscriptionId: string) {
    if (!this.managementToken) throw new Error('Not authenticated')
    const response = await fetch(
      `https://management.azure.com/subscriptions/${subscriptionId}/resourcegroups?api-version=2021-04-01`,
      {
        headers: {
          Authorization: `Bearer ${this.managementToken}`,
        },
      },
    )
    if (!response.ok) throw new Error('Failed to list resource groups')
    return response.json()
  }

  public async listGarnetClusters(
    subscriptionId: string,
    resourceGroupName: string,
  ) {
    if (!this.managementToken) throw new Error('Not authenticated')
    const response = await fetch(
      `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}` +
        `/resources?api-version=2025-04-01&$filter=resourceType eq 'Microsoft.DocumentDB/garnetClusters'`,
      {
        headers: {
          Authorization: `Bearer ${this.managementToken}`,
        },
      },
    )
    if (!response.ok) throw new Error('Failed to list garnet clusters')
    return response.json()
  }

  public async getGarnetCluster(
    subscriptionId: string,
    resourceGroupName: string,
    clusterName: string,
  ) {
    if (!this.managementToken) throw new Error('Not authenticated')
    const response = await fetch(
      `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}` +
        `/providers/Microsoft.DocumentDB/garnetClusters/${clusterName}?api-version=2025-11-01-preview`,
      {
        headers: {
          Authorization: `Bearer ${this.managementToken}`,
        },
      },
    )
    if (!response.ok) throw new Error('Failed to get garnet cluster details')
    return response.json()
  }

  public async getUserProfile() {
    if (!this.managementToken) return { name: 'Azure User' }
    try {
      const base64Url = this.managementToken.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map(function (c) {
            return `%${  (`00${  c.charCodeAt(0).toString(16)}`).slice(-2)}`
          })
          .join(''),
      )
      const payload = JSON.parse(jsonPayload)
      return {
        name:
          payload.upn ||
          payload.email ||
          payload.unique_name ||
          'Azure User',
        oid: payload.oid,
      }
    } catch (e) {
      return { name: 'default', oid: 'default' }
    }
  }
}
