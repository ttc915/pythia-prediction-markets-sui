'use client'

import { useEffect, useState } from 'react'
import { useZKLogin } from '~~/hooks/useZKLogin'
import { SuiClient } from '@mysten/sui/client'
import { getFullnodeUrl } from '@mysten/sui/client'

const ZKLoginBalance = () => {
    const { account, network } = useZKLogin()
    const [balance, setBalance] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        const fetchBalance = async () => {
            if (!account?.address) {
                setBalance(null)
                return
            }

            setIsLoading(true)
            try {
                // Create client for current network
                const client = new SuiClient({
                    url: getFullnodeUrl(network as any)
                })

                const balanceData = await client.getBalance({
                    owner: account.address,
                })

                // Convert from MIST to SUI (1 SUI = 1,000,000,000 MIST)
                const suiBalance = (Number(balanceData.totalBalance) / 1_000_000_000).toFixed(4)
                setBalance(suiBalance)
            } catch (error) {
                console.error('Error fetching balance:', error)
                setBalance('0.0000')
            } finally {
                setIsLoading(false)
            }
        }

        fetchBalance()
    }, [account, network])

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

export default ZKLoginBalance
