'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SuiClient } from '@mysten/sui/client'
import { getFullnodeUrl } from '@mysten/sui/client'
import { getExtendedEphemeralPublicKey } from '@mysten/sui/zklogin'
import {
  decodeJWT,
  fetchUserSalt,
  fetchZKProof,
  computeZkLoginAddress,
  restoreSession,
  restoreEphemeralKeyPair,
} from '~~/helpers/zkLoginHelpers'
import { setZKLoginSession } from '~~/context/zkLoginContext'
import { ENetwork } from '~~/types/ENetwork'
import type { ZKLoginAccount } from '~~/types/zkLoginTypes'

export default function AuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>(
    'processing'
  )
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract JWT from URL hash (Google returns id_token in hash)
        const hash = window.location.hash.substring(1)
        const params = new URLSearchParams(hash)
        const jwt = params.get('id_token')

        if (!jwt) {
          throw new Error('No JWT token found in callback URL')
        }

        // Restore session data stored before OAuth redirect
        const session = restoreSession()

        console.log('=== zkLogin Debug Info ===')
        console.log('Session restored:', {
          hasEphemeralKeyPair: !!session.ephemeralKeyPair,
          hasRandomness: !!session.randomness,
          hasNonce: !!session.nonce,
          maxEpoch: session.maxEpoch,
          randomness: session.randomness,
          nonce: session.nonce,
        })

        if (
          !session.ephemeralKeyPair ||
          !session.maxEpoch ||
          !session.randomness ||
          !session.nonce
        ) {
          throw new Error(
            'Session data not found. Please try logging in again.'
          )
        }

        setStatus('processing')

        // Decode JWT to get user info
        const decodedJwt = decodeJWT(jwt)
        console.log('JWT nonce:', decodedJwt.nonce)
        console.log('Stored nonce:', session.nonce)
        console.log('Nonces match:', decodedJwt.nonce === session.nonce)

        if (!session.extendedEphemeralPublicKey) {
          throw new Error('Extended ephemeral public key not found in session')
        }

        // Fetch user salt
        const userSalt = await fetchUserSalt(jwt)

        // Compute zkLogin address
        const address = computeZkLoginAddress(jwt, userSalt)

        console.log('Calling prover with:', {
          extendedEphemeralPublicKey: session.extendedEphemeralPublicKey,
          randomness: session.randomness,
          maxEpoch: session.maxEpoch,
        })

        // Fetch ZK proof using the stored extended public key
        const zkProof = await fetchZKProof(
          jwt,
          session.extendedEphemeralPublicKey,
          session.randomness,
          session.maxEpoch
        )

        // Create account object
        const account: ZKLoginAccount = {
          address,
          provider: 'google',
          email: decodedJwt.email,
          sub: decodedJwt.sub,
          aud: Array.isArray(decodedJwt.aud)
            ? decodedJwt.aud[0]
            : decodedJwt.aud,
        }

        // Save complete session and redirect
        setZKLoginSession({
          account,
          ephemeralKeyPair: session.ephemeralKeyPair,
          jwt,
          zkProof,
          userSalt,
          maxEpoch: session.maxEpoch,
          randomness: session.randomness,
          nonce: session.nonce,
        })

        setStatus('success')
      } catch (error) {
        console.error('OAuth callback error:', error)
        const message =
          error instanceof Error ? error.message : 'Authentication failed'
        setErrorMessage(message)
        setStatus('error')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="from-sds-blue/10 to-sds-pink/10 flex min-h-screen items-center justify-center bg-gradient-to-br">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl dark:bg-slate-800">
        {status === 'processing' && (
          <div className="text-center">
            <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-sds-blue border-r-transparent"></div>
            <h2 className="mb-2 text-xl font-semibold text-sds-dark dark:text-sds-light">
              Authenticating...
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Please wait while we complete your login
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="mb-4 inline-block h-12 w-12 rounded-full bg-green-100 p-3 dark:bg-green-900">
              <svg
                className="h-6 w-6 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-sds-dark dark:text-sds-light">
              Success!
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Redirecting to home...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="mb-4 inline-block h-12 w-12 rounded-full bg-red-100 p-3 dark:bg-red-900">
              <svg
                className="h-6 w-6 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-red-600 dark:text-red-400">
              Authentication Failed
            </h2>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              {errorMessage}
            </p>
            <button
              onClick={() => router.push('/')}
              className="hover:bg-sds-blue/90 rounded-lg bg-sds-blue px-6 py-2 text-white transition-colors"
            >
              Return Home
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
