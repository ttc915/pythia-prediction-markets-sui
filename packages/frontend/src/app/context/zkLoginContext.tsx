'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'
import { getExtendedEphemeralPublicKey } from '@mysten/sui/zklogin'
import type {
  ZKLoginContextValue,
  ZKLoginAccount,
  EphemeralKeyPair,
} from '~~/types/zkLoginTypes'
import {
  buildOAuthURL,
  cacheSession,
  clearSession,
  restoreSession,
  generateEphemeralKeyPair,
  restoreEphemeralKeyPair,
  isSessionValid as checkSessionValid,
  decodeJWT,
  assembleZkLoginSignature,
} from '~~/helpers/zkLoginHelpers'

// Create context
const ZKLoginContext = createContext<ZKLoginContextValue | null>(null)

// Provider props
interface ZKLoginProviderProps {
  children: ReactNode
}

/**
 * ZKLogin Context Provider
 * Manages zkLogin authentication state and operations
 */
export function ZKLoginProvider({ children }: ZKLoginProviderProps) {
  const [account, setAccount] = useState<ZKLoginAccount | null>(null)
  const [ephemeralKeyPair, setEphemeralKeyPair] =
    useState<EphemeralKeyPair | null>(null)
  const [jwt, setJwt] = useState<string | null>(null)
  const [zkProof, setZkProof] = useState<any | null>(null)
  const [userSalt, setUserSalt] = useState<string | null>(null)
  const [maxEpoch, setMaxEpoch] = useState<number | null>(null)
  const [randomness, setRandomness] = useState<string | null>(null)
  const [nonce, setNonce] = useState<string | null>(null)
  const [network, setNetworkState] = useState<string>('testnet')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Create SuiClient based on selected network
  const suiClient = React.useMemo(() => {
    return new SuiClient({
      url: getFullnodeUrl(network as any),
    })
  }, [network])

  /**
   * Initialize and restore session on mount
   */
  useEffect(() => {
    const loadSession = async () => {
      const session = restoreSession()

      // Restore network preference or default to testnet
      if (session.network) {
        setNetworkState(session.network)
      }

      if (session.account && session.ephemeralKeyPair && session.maxEpoch) {
        // Check if session is still valid
        const valid = await checkSessionValid(suiClient, session.maxEpoch)

        if (valid) {
          setAccount(session.account)
          setEphemeralKeyPair(session.ephemeralKeyPair)
          setJwt(session.jwt)
          setZkProof(session.zkProof)
          setUserSalt(session.userSalt)
          setMaxEpoch(session.maxEpoch)
          setRandomness(session.randomness)
          setNonce(session.nonce)
        } else {
          // Session expired, clear it
          clearSession()
        }
      }
    }

    loadSession()
  }, [suiClient])

  /**
   * Initiate OAuth login flow
   */
  const login = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Generate ephemeral key pair
      const { keyPair, serialized } = generateEphemeralKeyPair()

      // Get extended ephemeral public key
      const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(
        keyPair.getPublicKey()
      )

      // Build OAuth URL with nonce
      const {
        url,
        nonce: generatedNonce,
        randomness: generatedRandomness,
        maxEpoch: generatedMaxEpoch,
      } = await buildOAuthURL(suiClient, keyPair)

      // Cache ephemeral key pair and metadata (including extended public key)
      cacheSession({
        ephemeralKeyPair: serialized,
        maxEpoch: generatedMaxEpoch,
        randomness: generatedRandomness,
        nonce: generatedNonce,
        extendedEphemeralPublicKey,
      })

      // Redirect to OAuth provider
      window.location.href = url
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to initiate login'
      setError(message)
      console.error('Login error:', err)
      setIsLoading(false)
    }
  }, [suiClient])

  /**
   * Logout and clear session
   */
  const logout = useCallback(() => {
    setAccount(null)
    setEphemeralKeyPair(null)
    setJwt(null)
    setZkProof(null)
    setUserSalt(null)
    setMaxEpoch(null)
    setRandomness(null)
    setNonce(null)
    setError(null)
    clearSession()
  }, [])

  /**
   * Get current zkLogin address
   */
  const getAddress = useCallback(() => {
    return account?.address || null
  }, [account])

  /**
   * Check if session is valid
   */
  const isSessionValidCheck = useCallback(async () => {
    return await checkSessionValid(suiClient, maxEpoch)
  }, [suiClient, maxEpoch])

  /**
   * Set network and persist it
   */
  const setNetwork = useCallback((newNetwork: string) => {
    setNetworkState(newNetwork)
    cacheSession({ network: newNetwork })
  }, [])

  /**
   * Sign and execute transaction with zkLogin signature
   */
  const signAndExecuteTransaction = useCallback(
    async (transactionBlock: Transaction) => {
      if (
        !account ||
        !ephemeralKeyPair ||
        !zkProof ||
        !userSalt ||
        !jwt ||
        maxEpoch === null
      ) {
        throw new Error('Not authenticated. Please login first.')
      }

      try {
        // Restore ephemeral key pair
        const keyPair = restoreEphemeralKeyPair(ephemeralKeyPair)

        // Set transaction sender
        transactionBlock.setSender(account.address)

        // Sign transaction with ephemeral key pair
        const { bytes, signature: userSignature } = await transactionBlock.sign(
          {
            client: suiClient,
            signer: keyPair,
          }
        )

        // Decode JWT for address seed
        const decodedJwt = decodeJWT(jwt)

        // Assemble zkLogin signature
        const zkLoginSignature = assembleZkLoginSignature(
          userSignature,
          zkProof,
          maxEpoch,
          userSalt,
          decodedJwt
        )

        // Execute transaction
        const result = await suiClient.executeTransactionBlock({
          transactionBlock: bytes,
          signature: zkLoginSignature,
        })

        return result
      } catch (err) {
        console.error('Transaction error:', err)
        throw err
      }
    },
    [account, ephemeralKeyPair, zkProof, userSalt, jwt, maxEpoch, suiClient]
  )

  const contextValue: ZKLoginContextValue = {
    account,
    ephemeralKeyPair,
    jwt,
    zkProof,
    userSalt,
    maxEpoch,
    randomness,
    nonce,
    network,
    isLoading,
    error,
    login,
    logout,
    signAndExecuteTransaction,
    getAddress,
    isSessionValid: isSessionValidCheck,
    setNetwork,
  }

  return (
    <ZKLoginContext.Provider value={contextValue}>
      {children}
    </ZKLoginContext.Provider>
  )
}

/**
 * Hook to access zkLogin context
 */
export function useZKLogin(): ZKLoginContextValue {
  const context = useContext(ZKLoginContext)

  if (!context) {
    throw new Error('useZKLogin must be used within ZKLoginProvider')
  }

  return context
}

// Also export a method to set session after OAuth callback
export function setZKLoginSession(data: {
  account: ZKLoginAccount
  ephemeralKeyPair: EphemeralKeyPair
  jwt: string
  zkProof: any
  userSalt: string
  maxEpoch: number
  randomness: string
  nonce: string
}) {
  cacheSession(data)

  // Trigger page reload to load the new session
  if (typeof window !== 'undefined') {
    window.location.href = '/'
  }
}
