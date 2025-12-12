// zkLogin configuration

export const ZKLOGIN_CONFIG = {
  // Mysten Labs services
  PROVER_URL:
    process.env.NEXT_PUBLIC_MYSTEN_PROVER_URL ||
    'https://prover-dev.mystenlabs.com/v1',
  SALT_SERVICE_URL:
    process.env.NEXT_PUBLIC_MYSTEN_SALT_SERVICE_URL ||
    'https://salt.api.mystenlabs.com/get_salt',

  // OAuth configuration
  GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
  REDIRECT_URL:
    process.env.NEXT_PUBLIC_REDIRECT_URL ||
    'http://localhost:3000/auth/callback',

  // Session storage keys
  STORAGE_KEYS: {
    EPHEMERAL_KEY_PAIR: 'zklogin_ephemeral_keypair',
    JWT: 'zklogin_jwt',
    ZK_PROOF: 'zklogin_proof',
    USER_SALT: 'zklogin_user_salt',
    MAX_EPOCH: 'zklogin_max_epoch',
    RANDOMNESS: 'zklogin_randomness',
    NONCE: 'zklogin_nonce',
    ACCOUNT: 'zklogin_account',
    EXTENDED_EPH_PUBLIC_KEY: 'zklogin_extended_eph_public_key',
    NETWORK: 'zklogin_network',
  },

  // Default epoch offset (ephemeral key will be valid for 2 epochs)
  MAX_EPOCH_OFFSET: 2,

  // OAuth scopes
  GOOGLE_SCOPE: 'openid email profile',
} as const

// OAuth provider configurations
export const getGoogleOAuthURL = (nonce: string): string => {
  const params = new URLSearchParams({
    client_id: ZKLOGIN_CONFIG.GOOGLE_CLIENT_ID,
    response_type: 'id_token',
    redirect_uri: ZKLOGIN_CONFIG.REDIRECT_URL,
    scope: ZKLOGIN_CONFIG.GOOGLE_SCOPE,
    nonce: nonce,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}
