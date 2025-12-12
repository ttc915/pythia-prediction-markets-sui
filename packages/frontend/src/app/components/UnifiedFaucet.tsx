'use client'

import { useState } from 'react'
import { Button } from '@radix-ui/themes'
import { useUnifiedWallet } from '~~/context/UnifiedWalletContext'
import { CoinsIcon } from 'lucide-react'

const NETWORKS_WITH_FAUCET = ['localnet', 'devnet', 'testnet']

interface UnifiedFaucetProps {
  onSuccess?: (message: string | null, description?: string) => void
  onError?: (error: Error | null, description?: string) => void
}

// Get the appropriate faucet URL based on network
const getFaucetUrl = (network: string): string => {
  switch (network) {
    case 'devnet':
      return 'https://faucet.devnet.sui.io/v1/gas'
    case 'testnet':
      return 'https://faucet.testnet.sui.io/v1/gas'
    case 'localnet':
      return 'http://localhost:9123/gas'
    default:
      return 'https://faucet.testnet.sui.io/v1/gas'
  }
}

const UnifiedFaucet = ({ onSuccess, onError }: UnifiedFaucetProps) => {
  const { account, network } = useUnifiedWallet()
  const [isLoading, setIsLoading] = useState(false)

  const handleFaucetRequest = async () => {
    if (!account?.address) {
      onError?.(null, 'No account connected')
      return
    }

    if (!NETWORKS_WITH_FAUCET.includes(network)) {
      onError?.(null, `Faucet not available for ${network}`)
      return
    }

    setIsLoading(true)
    try {
      const faucetUrl = getFaucetUrl(network)
      const response = await fetch(faucetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          FixedAmountRequest: {
            recipient: account.address,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.message || `Faucet request failed: ${response.status}`
        )
      }

      await response.json() // Consume the response
      onSuccess?.(null, `Successfully received SUI tokens on ${network}!`)
    } catch (error) {
      console.error('Faucet error:', error)
      onError?.(
        error instanceof Error ? error : new Error('Faucet request failed'),
        undefined
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (!account) {
    return null
  }

  if (!NETWORKS_WITH_FAUCET.includes(network)) {
    return null
  }

  return (
    <Button
      variant="ghost"
      onClick={handleFaucetRequest}
      disabled={isLoading}
      className="flex flex-row items-center gap-1"
    >
      <CoinsIcon className="h-4 w-4" />
      <span>{isLoading ? 'Requesting...' : 'Faucet'}</span>
    </Button>
  )
}

export default UnifiedFaucet
