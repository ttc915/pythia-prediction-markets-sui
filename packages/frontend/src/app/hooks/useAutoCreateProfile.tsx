'use client'

import { useEffect, useRef, useState } from 'react'
import { useUnifiedWallet } from '~~/context/UnifiedWalletContext'
import { usePythia } from './usePythia'

/**
 * Hook that automatically creates a user profile when a wallet is connected
 * if the profile doesn't already exist.
 */
export function useAutoCreateProfile() {
    const { account } = useUnifiedWallet()
    const { checkUserProfileExists, createUserProfile, isConfigured } =
        usePythia()

    const [isCreating, setIsCreating] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const [profileCreated, setProfileCreated] = useState(false)

    // Track which addresses we've already processed to avoid duplicate attempts
    const processedAddresses = useRef<Set<string>>(new Set())

    useEffect(() => {
        const autoCreateProfile = async () => {
            // Skip if no account connected
            if (!account) {
                return
            }

            // Skip if contract not configured
            if (!isConfigured) {
                return
            }

            // Skip if we've already processed this address
            if (processedAddresses.current.has(account.address)) {
                return
            }

            // Skip if already creating
            if (isCreating) {
                return
            }

            try {
                setIsCreating(true)
                setError(null)

                // Check if profile already exists
                const profileExists = await checkUserProfileExists(account.address)

                if (!profileExists) {
                    console.log(
                        `Creating user profile for address: ${account.address.slice(0, 8)}...`
                    )

                    // Create the profile
                    await createUserProfile()

                    console.log('User profile created successfully!')
                    setProfileCreated(true)

                    // Give the blockchain a moment to index the new profile
                    await new Promise((resolve) => setTimeout(resolve, 1500))
                } else {
                    console.log(
                        `User profile already exists for: ${account.address.slice(0, 8)}...`
                    )
                }

                // Mark this address as processed
                processedAddresses.current.add(account.address)
            } catch (err) {
                console.error('Failed to auto-create user profile:', err)
                setError(
                    err instanceof Error ? err : new Error('Failed to create profile')
                )
            } finally {
                setIsCreating(false)
            }
        }

        autoCreateProfile()
    }, [account, isConfigured, checkUserProfileExists, createUserProfile])

    return {
        isCreating,
        error,
        profileCreated,
    }
}
