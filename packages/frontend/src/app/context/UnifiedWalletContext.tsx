'use client'

import React, { createContext, useContext, ReactNode, useMemo } from 'react'
import { useCurrentAccount, useDisconnectWallet, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { useZKLogin } from '~~/hooks/useZKLogin'
import { Transaction } from '@mysten/sui/transactions'

export type AccountType = 'zklogin' | 'wallet' | null

interface UnifiedAccount {
  address: string
  type: AccountType
  email?: string // Only for zkLogin
}

interface UnifiedWalletContextValue {
  // Current account (from either zkLogin or wallet)
  account: UnifiedAccount | null
  accountType: AccountType

  // Network
  network: string
  setNetwork: (network: string) => void

  // Connection methods
  loginWithGoogle: () => Promise<void>
  disconnect: () => void

  // Transaction signing
  signAndExecuteTransaction: (tx: Transaction) => Promise<any>

  // Utilities
  getAddress: () => string | null
  isLoading: boolean
}

const UnifiedWalletContext = createContext<UnifiedWalletContextValue | null>(
  null
)

export function UnifiedWalletProvider({ children }: { children: ReactNode }) {
  // Get both zkLogin and wallet accounts
  const zkLogin = useZKLogin()
  const walletAccount = useCurrentAccount()
  const { mutate: disconnectWallet } = useDisconnectWallet()

  // Determine which account is active (zkLogin takes precedence if both exist)
  const unifiedAccount: UnifiedAccount | null = useMemo(() => {
    if (zkLogin.account) {
      return {
        address: zkLogin.account.address,
        type: 'zklogin',
        email: zkLogin.account.email,
      }
    }
    if (walletAccount) {
      return {
        address: walletAccount.address,
        type: 'wallet',
      }
    }
    return null
  }, [zkLogin.account, walletAccount])

  const accountType: AccountType = unifiedAccount?.type || null

  // Unified disconnect - handles both account types
  const disconnect = () => {
    if (accountType === 'zklogin') {
      zkLogin.logout()
    } else if (accountType === 'wallet') {
      disconnectWallet()
    }
  }

  // Get wallet transaction signer
  const { mutateAsync: walletSignAndExecuteTransaction } = useSignAndExecuteTransaction()

  // Unified transaction signing
  const signAndExecuteTransaction = async (tx: Transaction) => {
    if (accountType === 'zklogin') {
      return await zkLogin.signAndExecuteTransaction(tx)
    }

    // For wallet transactions
    if (accountType === 'wallet') {
      return await walletSignAndExecuteTransaction({
        transaction: tx,
      })
    }

    throw new Error('No active account connected')
  }

  const getAddress = () => {
    return unifiedAccount?.address || null
  }

  const contextValue: UnifiedWalletContextValue = {
    account: unifiedAccount,
    accountType,
    network: zkLogin.network,
    setNetwork: zkLogin.setNetwork,
    loginWithGoogle: zkLogin.login,
    disconnect,
    signAndExecuteTransaction,
    getAddress,
    isLoading: zkLogin.isLoading,
  }

  return (
    <UnifiedWalletContext.Provider value={contextValue}>
      {children}
    </UnifiedWalletContext.Provider>
  )
}

export function useUnifiedWallet(): UnifiedWalletContextValue {
  const context = useContext(UnifiedWalletContext)

  if (!context) {
    throw new Error(
      'useUnifiedWallet must be used within UnifiedWalletProvider'
    )
  }

  return context
}
