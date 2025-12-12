'use client'

import { useCallback } from 'react'
import { Transaction } from '@mysten/sui/transactions'
import { useZKLogin } from '~~/hooks/useZKLogin'

interface UseZKLoginTransactOptions {
    onBeforeStart?: () => void
    onSuccess?: (data: any) => void
    onError?: (error: Error) => void
}

/**
 * Hook to handle zkLogin transactions
 * Similar to useTransact from @suiware/kit but adapted for zkLogin
 */
export function useZKLoginTransact(options: UseZKLoginTransactOptions = {}) {
    const { signAndExecuteTransaction } = useZKLogin()
    const { onBeforeStart, onSuccess, onError } = options

    const transact = useCallback(
        async (transaction: Transaction) => {
            try {
                if (onBeforeStart) {
                    onBeforeStart()
                }

                const result = await signAndExecuteTransaction(transaction)

                if (onSuccess) {
                    onSuccess(result)
                }

                return result
            } catch (error) {
                console.error('Transaction error:', error)
                const err = error instanceof Error ? error : new Error('Transaction failed')

                if (onError) {
                    onError(err)
                }

                throw err
            }
        },
        [signAndExecuteTransaction, onBeforeStart, onSuccess, onError]
    )

    return { transact }
}
