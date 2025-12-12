// zkLogin helper functions

import { SuiClient } from '@mysten/sui/client'
import {
  generateNonce,
  generateRandomness,
  getExtendedEphemeralPublicKey,
  jwtToAddress,
  genAddressSeed,
  getZkLoginSignature,
} from '@mysten/sui/zklogin'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { ZKLOGIN_CONFIG, getGoogleOAuthURL } from '~~/config/zkLoginConfig'
import type {
  DecodedJWT,
  EphemeralKeyPair,
  ZKProof,
} from '~~/types/zkLoginTypes'

/**
 * Generate ephemeral key pair for zkLogin
 */
export function generateEphemeralKeyPair(): {
  keyPair: Ed25519Keypair
  serialized: EphemeralKeyPair
} {
  const keyPair = new Ed25519Keypair()

  // Get the secret key (32 bytes)
  const secretKey = keyPair.getSecretKey()

  // Take only the first 32 bytes (the actual secret key, not the seed)
  const privateKeyBytes = secretKey.slice(0, 32)

  return {
    keyPair,
    serialized: {
      publicKey: keyPair.getPublicKey().toBase64(),
      privateKey: Buffer.from(privateKeyBytes).toString('base64'),
      scheme: 'ED25519',
    },
  }
}

/**
 * Restore ephemeral key pair from serialized format
 */
export function restoreEphemeralKeyPair(
  serialized: EphemeralKeyPair
): Ed25519Keypair {
  const privateKeyBytes = Buffer.from(serialized.privateKey, 'base64')
  return Ed25519Keypair.fromSecretKey(privateKeyBytes)
}

/**
 * Build OAuth URL with nonce
 */
export async function buildOAuthURL(
  suiClient: SuiClient,
  ephemeralKeyPair: Ed25519Keypair
): Promise<{
  url: string
  nonce: string
  randomness: string
  maxEpoch: number
}> {
  // Get current epoch
  const { epoch } = await suiClient.getLatestSuiSystemState()
  const maxEpoch = Number(epoch) + ZKLOGIN_CONFIG.MAX_EPOCH_OFFSET

  // Generate randomness and nonce
  const randomness = generateRandomness()
  const nonce = generateNonce(
    ephemeralKeyPair.getPublicKey(),
    maxEpoch,
    randomness
  )

  // Build OAuth URL
  const url = getGoogleOAuthURL(nonce)

  return {
    url,
    nonce,
    randomness,
    maxEpoch,
  }
}

/**
 * Decode JWT token
 */
export function decodeJWT(jwt: string): DecodedJWT {
  const parts = jwt.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format')
  }

  const payload = parts[1]
  const decoded = JSON.parse(
    atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
  )

  return decoded
}

/**
 * Fetch user salt from Mysten Labs service via proxy
 */
export async function fetchUserSalt(jwt: string): Promise<string> {
  try {
    // Use local API proxy to avoid CORS issues
    const response = await fetch('/api/zklogin/salt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: jwt }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(
        errorData.error || `Salt service returned ${response.status}`
      )
    }

    const data = await response.json()
    return data.salt
  } catch (error) {
    console.error('Error fetching salt:', error)
    throw new Error('Failed to fetch user salt')
  }
}

/**
 * Fetch ZK proof from Mysten Labs prover service via proxy
 */
export async function fetchZKProof(
  jwt: string,
  extendedEphemeralPublicKey: string,
  randomness: string,
  maxEpoch: number
): Promise<any> {
  try {
    // Use local API proxy to avoid CORS issues
    const response = await fetch('/api/zklogin/prover', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jwt,
        extendedEphemeralPublicKey,
        maxEpoch,
        jwtRandomness: randomness,
        salt: randomness,
        keyClaimName: 'sub',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(
        errorData.error || `Prover service returned ${response.status}`
      )
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching ZK proof:', error)
    throw new Error('Failed to fetch ZK proof')
  }
}

/**
 * Compute zkLogin Sui address
 */
export function computeZkLoginAddress(jwt: string, userSalt: string): string {
  return jwtToAddress(jwt, BigInt(userSalt))
}

/**
 * Assemble zkLogin signature for transaction
 */
export function assembleZkLoginSignature(
  userSignature: string,
  zkProof: any,
  maxEpoch: number,
  userSalt: string,
  decodedJwt: DecodedJWT
): string {
  const addressSeed = genAddressSeed(
    BigInt(userSalt),
    'sub',
    decodedJwt.sub,
    Array.isArray(decodedJwt.aud) ? decodedJwt.aud[0] : decodedJwt.aud
  ).toString()

  return getZkLoginSignature({
    inputs: {
      ...zkProof,
      addressSeed,
    },
    maxEpoch,
    userSignature,
  })
}

/**
 * Check if session is still valid (epoch check)
 */
export async function isSessionValid(
  suiClient: SuiClient,
  maxEpoch: number | null
): Promise<boolean> {
  if (maxEpoch === null) return false

  try {
    const { epoch } = await suiClient.getLatestSuiSystemState()
    return Number(epoch) <= maxEpoch
  } catch (error) {
    console.error('Error checking session validity:', error)
    return false
  }
}

/**
 * Cache session data to session storage
 */
export function cacheSession(data: {
  ephemeralKeyPair?: EphemeralKeyPair
  jwt?: string
  zkProof?: any
  userSalt?: string
  maxEpoch?: number
  randomness?: string
  nonce?: string
  account?: any
  extendedEphemeralPublicKey?: string
  network?: string
}): void {
  if (typeof window === 'undefined') return

  const { STORAGE_KEYS } = ZKLOGIN_CONFIG

  if (data.ephemeralKeyPair) {
    sessionStorage.setItem(
      STORAGE_KEYS.EPHEMERAL_KEY_PAIR,
      JSON.stringify(data.ephemeralKeyPair)
    )
  }

  if (data.jwt) {
    sessionStorage.setItem(STORAGE_KEYS.JWT, data.jwt)
  }

  if (data.zkProof) {
    sessionStorage.setItem(STORAGE_KEYS.ZK_PROOF, JSON.stringify(data.zkProof))
  }

  if (data.userSalt) {
    sessionStorage.setItem(STORAGE_KEYS.USER_SALT, data.userSalt)
  }

  if (data.maxEpoch !== undefined) {
    sessionStorage.setItem(STORAGE_KEYS.MAX_EPOCH, data.maxEpoch.toString())
  }

  if (data.randomness) {
    sessionStorage.setItem(STORAGE_KEYS.RANDOMNESS, data.randomness)
  }

  if (data.nonce) {
    sessionStorage.setItem(STORAGE_KEYS.NONCE, data.nonce)
  }

  if (data.account) {
    sessionStorage.setItem(STORAGE_KEYS.ACCOUNT, JSON.stringify(data.account))
  }

  if (data.extendedEphemeralPublicKey) {
    sessionStorage.setItem(
      STORAGE_KEYS.EXTENDED_EPH_PUBLIC_KEY,
      data.extendedEphemeralPublicKey
    )
  }

  if (data.network) {
    sessionStorage.setItem(STORAGE_KEYS.NETWORK, data.network)
  }
}

/**
 * Restore session data from session storage
 */
export function restoreSession(): {
  ephemeralKeyPair: EphemeralKeyPair | null
  jwt: string | null
  zkProof: any | null
  userSalt: string | null
  maxEpoch: number | null
  randomness: string | null
  nonce: string | null
  account: any | null
  extendedEphemeralPublicKey: string | null
  network: string | null
} {
  if (typeof window === 'undefined') {
    return {
      ephemeralKeyPair: null,
      jwt: null,
      zkProof: null,
      userSalt: null,
      maxEpoch: null,
      randomness: null,
      nonce: null,
      account: null,
      extendedEphemeralPublicKey: null,
      network: null,
    }
  }

  const { STORAGE_KEYS } = ZKLOGIN_CONFIG

  const ephemeralKeyPairStr = sessionStorage.getItem(
    STORAGE_KEYS.EPHEMERAL_KEY_PAIR
  )
  const jwt = sessionStorage.getItem(STORAGE_KEYS.JWT)
  const zkProofStr = sessionStorage.getItem(STORAGE_KEYS.ZK_PROOF)
  const userSalt = sessionStorage.getItem(STORAGE_KEYS.USER_SALT)
  const maxEpochStr = sessionStorage.getItem(STORAGE_KEYS.MAX_EPOCH)
  const randomness = sessionStorage.getItem(STORAGE_KEYS.RANDOMNESS)
  const nonce = sessionStorage.getItem(STORAGE_KEYS.NONCE)
  const accountStr = sessionStorage.getItem(STORAGE_KEYS.ACCOUNT)
  const extendedEphemeralPublicKey = sessionStorage.getItem(
    STORAGE_KEYS.EXTENDED_EPH_PUBLIC_KEY
  )
  const network = sessionStorage.getItem(STORAGE_KEYS.NETWORK)

  return {
    ephemeralKeyPair: ephemeralKeyPairStr
      ? JSON.parse(ephemeralKeyPairStr)
      : null,
    jwt,
    zkProof: zkProofStr ? JSON.parse(zkProofStr) : null,
    userSalt,
    maxEpoch: maxEpochStr ? parseInt(maxEpochStr, 10) : null,
    randomness,
    nonce,
    account: accountStr ? JSON.parse(accountStr) : null,
    extendedEphemeralPublicKey,
    network,
  }
}

/**
 * Clear session data
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return

  const { STORAGE_KEYS } = ZKLOGIN_CONFIG

  Object.values(STORAGE_KEYS).forEach((key) => {
    sessionStorage.removeItem(key)
  })
}
