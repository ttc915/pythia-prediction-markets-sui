'use client'

import { useEffect, useState } from 'react'
import { useUnifiedWallet } from '~~/context/UnifiedWalletContext'
import { useSuiClientQuery } from '@mysten/dapp-kit'

const UnifiedBalance = () => {
  const { account, accountType, network } = useUnifiedWallet()
  const [balance, setBalance] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // For wallet accounts, use the dapp-kit query
  const { data: walletBalanceData } = useSuiClientQuery(
    'getBalance',
    { owner: account?.address || '' },
    {
      enabled: accountType === 'wallet' && !!account?.address,
    }
  )

  useEffect(() => {
    const fetchZkLoginBalance = async () => {
      if (accountType !== 'zklogin' || !account?.address) {
        setBalance(null)
        return
      }

      setIsLoading(true)
      try {
        const { SuiClient } = await import('@mysten/sui/client')
        const { getFullnodeUrl } = await import('@mysten/sui/client')

        const client = new SuiClient({
          url: getFullnodeUrl(network as any),
        })

        const balanceData = await client.getBalance({
          owner: account.address,
        })

        const suiBalance = (
          Number(balanceData.totalBalance) / 1_000_000_000
        ).toFixed(4)
        setBalance(suiBalance)
      } catch (error) {
        console.error('Error fetching balance:', error)
        setBalance('0.0000')
      } finally {
        setIsLoading(false)
      }
    }

    if (accountType === 'zklogin') {
      fetchZkLoginBalance()
    } else if (accountType === 'wallet' && walletBalanceData) {
      const suiBalance = (
        Number(walletBalanceData.totalBalance) / 1_000_000_000
      ).toFixed(4)
      setBalance(suiBalance)
    }
  }, [account, accountType, network, walletBalanceData])

  if (!account) {
    return (
      <div className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        Disconnected
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
      {isLoading ? (
        <span className="text-slate-600 dark:text-slate-400">Loading...</span>
      ) : (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {balance !== null ? `${balance} SUI` : '0.0000 SUI'}
        </span>
      )}
    </div>
  )
}

export default UnifiedBalance
