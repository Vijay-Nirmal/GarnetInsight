import React, { useEffect, useState } from 'react'
import { AzureService, DeviceCodeResponse } from 'uiSrc/services/azureService'
import { IpcOnEvent } from 'uiSrc/electron/constants'
import { FormDialog } from 'uiSrc/components'
import { Title, Text } from 'uiSrc/components/base/text'
import {
  PrimaryButton,
  SecondaryButton,
  EmptyButton,
} from 'uiSrc/components/base/forms/buttons'
import { Row, Col } from 'uiSrc/components/base/layout/flex'
import {
  AzureIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  RedisDbBlueIcon,
  LoaderLargeIcon,
  CloudIcon,
  GroupModeIcon,
} from 'uiSrc/components/base/icons'

interface Props {
  onClose: () => void
  onConnect: (connectionDetails: any) => void
}

const AzureConnectionModal = ({ onClose, onConnect }: Props) => {
  const [step, setStep] = useState<
    'login' | 'loading' | 'resources'
  >('login')
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [expandedSubs, setExpandedSubs] = useState<Record<string, boolean>>({})
  const [resourceGroups, setResourceGroups] = useState<Record<string, any[]>>({})
  const [expandedRGs, setExpandedRGs] = useState<Record<string, boolean>>({})
  const [accounts, setAccounts] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const azureService = AzureService.getInstance()

  useEffect(() => {
    // Check if already logged in
    if (azureService.getManagementToken()) {
      setStep('loading')
      loadSubscriptions()
    }
  }, [])

  const handleLogin = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await azureService.startDeviceLogin()
      if (result && result.accessToken) {
        azureService.setManagementToken(result.accessToken)
        setStep('loading')
        await loadSubscriptions()
      }
    } catch (err: any) {
      setError(err.message)
      setStep('login')
    } finally {
      setLoading(false)
    }
  }

  const loadSubscriptions = async () => {
    try {
      const subs = await azureService.listSubscriptions()
      setSubscriptions(subs.value)
      setStep('resources')
    } catch (err: any) {
      setError(err.message)
      setStep('login')
    }
  }

  const toggleSubscription = async (subId: string) => {
    setExpandedSubs((prev) => ({ ...prev, [subId]: !prev[subId] }))
    if (!resourceGroups[subId]) {
      try {
        const rgs = await azureService.listResourceGroups(subId)
        setResourceGroups((prev) => ({ ...prev, [subId]: rgs.value }))
      } catch (err: any) {
        setError(err.message)
      }
    }
  }

  const toggleResourceGroup = async (subId: string, rgName: string) => {
    const key = `${subId}/${rgName}`
    setExpandedRGs((prev) => ({ ...prev, [key]: !prev[key] }))
    if (!accounts[key]) {
      try {
        const garnetClusters = await azureService
          .listGarnetClusters(subId, rgName)
          .catch(() => ({ value: [] }))

        const allResources = (garnetClusters.value || [])

        setAccounts((prev) => ({ ...prev, [key]: allResources }))
      } catch (err: any) {
        setError(err.message)
      }
    }
  }

  const handleConnect = async (account: any) => {
    try {
      setLoading(true)
      const cosmosToken = await azureService.getCosmosAccessToken()
      const userProfile = await azureService.getUserProfile()

      // Parse subscriptionId and resourceGroupName from account.id
      // account.id format: /subscriptions/{subId}/resourceGroups/{rgName}/...
      const idParts = account.id.split('/')
      const subscriptionId = idParts[2]
      const resourceGroupName = idParts[4]

      const clusterDetails = await azureService.getGarnetCluster(
        subscriptionId,
        resourceGroupName,
        account.name,
      )

      const node = clusterDetails.properties?.nodes?.[0]
      if (!node) {
        throw new Error('No nodes found in Garnet Cluster')
      }

      const host = node.ipAddress
      const port = node.port

      const connectionDetails = {
        name: account.name,
        host,
        port,
        password: cosmosToken,
        username: userProfile.oid,
        tls: true,
      }
      onConnect(connectionDetails)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const renderLogin = () => (
    <Col align="center" gap="l" style={{ padding: '40px' }}>
      <div style={{ width: 64, height: 64 }}>
        <AzureIcon />
      </div>
      <Title size="L">Connect to Azure</Title>
      <Text>
        Connect to your Azure account to list your Cosmos DB Garnet Cache
        resources.
      </Text>
      {error && <Text color="error">{error}</Text>}
      <PrimaryButton onClick={handleLogin} disabled={loading}>
        {loading ? (
          <Row align="center" gap="s">
            <div style={{ width: 16, height: 16 }}>
              <LoaderLargeIcon />
            </div>
            <Text>Waiting for browser...</Text>
          </Row>
        ) : (
          'Sign in with Azure'
        )}
      </PrimaryButton>
    </Col>
  )

  const renderResources = () => (
    <Col style={{ height: '400px', overflowY: 'auto', padding: '20px' }}>
      {subscriptions.map((sub) => (
        <Col key={sub.subscriptionId} grow={false}>
          <Row
            align="center"
            gap="s"
            onClick={() => toggleSubscription(sub.subscriptionId)}
            style={{ cursor: 'pointer', padding: '8px 0' }}
          >
            {expandedSubs[sub.subscriptionId] ? (
              <ChevronDownIcon />
            ) : (
              <ChevronRightIcon />
            )}
            <CloudIcon size="M" />
            <Text style={{ fontWeight: 'bold' }}>{sub.displayName}</Text>
          </Row>
          {expandedSubs[sub.subscriptionId] && (
            <Col style={{ paddingLeft: '20px' }} grow={false}>
              {resourceGroups[sub.subscriptionId]?.map((rg) => (
                <Col key={rg.id} grow={false}>
                  <Row
                    align="center"
                    gap="s"
                    onClick={() =>
                      toggleResourceGroup(sub.subscriptionId, rg.name)
                    }
                    style={{ cursor: 'pointer', padding: '4px 0' }}
                  >
                    {expandedRGs[`${sub.subscriptionId}/${rg.name}`] ? (
                      <ChevronDownIcon />
                    ) : (
                      <ChevronRightIcon />
                    )}
                    <GroupModeIcon size="M" />
                    <Text>{rg.name}</Text>
                  </Row>
                  {expandedRGs[`${sub.subscriptionId}/${rg.name}`] && (
                    <Col style={{ paddingLeft: '20px' }} grow={false}>
                      {accounts[`${sub.subscriptionId}/${rg.name}`]?.map(
                        (acc) => (
                          <Row
                            key={acc.id}
                            align="center"
                            justify="between"
                            style={{ padding: '4px 0' }}
                          >
                            <Row align="center" gap="s">
                              <RedisDbBlueIcon size="XL" />
                              <Text>{acc.name}</Text>
                            </Row>
                            <EmptyButton
                              size="small"
                              onClick={() => handleConnect(acc)}
                            >
                              Connect
                            </EmptyButton>
                          </Row>
                        ),
                      )}
                      {accounts[`${sub.subscriptionId}/${rg.name}`]?.length ===
                        0 && <Text color="subtle">No accounts found</Text>}
                    </Col>
                  )}
                </Col>
              ))}
            </Col>
          )}
        </Col>
      ))}
    </Col>
  )

  return (
    <FormDialog
      isOpen
      onClose={onClose}
      header={<Title size="L">Connect Azure Database</Title>}
      footer={
        <Row justify="end" gap="m" style={{ padding: '20px' }}>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        </Row>
      }
    >
      {step === 'login' && renderLogin()}
      {step === 'loading' && (
        <Col align="center" justify="center" style={{ height: '300px' }}>
          <LoaderLargeIcon />
        </Col>
      )}
      {step === 'resources' && renderResources()}
    </FormDialog>
  )
}

export default AzureConnectionModal
