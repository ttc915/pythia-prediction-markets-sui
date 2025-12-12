// zkLogin type definitions

export interface ZKLoginAccount {
  address: string
  provider: 'google'
  email?: string
  sub: string // OAuth subject ID
  aud: string // OAuth audience
}

export interface EphemeralKeyPair {
  publicKey: string
  privateKey: string
  scheme: 'ED25519'
}

export interface ZKProof {
  proof: string
  inputs: {
    addressSeed: string
    [key: string]: unknown
  }
}

export interface ZKLoginState {
  account: ZKLoginAccount | null
  ephemeralKeyPair: EphemeralKeyPair | null
  jwt: string | null
  zkProof: ZKProof | null
  userSalt: string | null
  maxEpoch: number | null
  randomness: string | null
  nonce: string | null
  network: string
  isLoading: boolean
  error: string | null
}

export interface ZKLoginContextValue extends ZKLoginState {
  // Authentication methods
  login: () => Promise<void>
  logout: () => void

  // Transaction methods
  signAndExecuteTransaction: (transactionBlock: any) => Promise<any>

  // Utility methods
  getAddress: () => string | null
  isSessionValid: () => Promise<boolean>
  setNetwork: (network: string) => void
}

export interface OAuthProviderConfig {
  name: string
  clientId: string
  authUrl: string
  redirectUrl: string
  scope: string
}

export interface DecodedJWT {
  sub: string
  aud: string | string[]
  iss: string
  email?: string
  email_verified?: boolean
  exp: number
  iat: number
  nonce?: string
}
