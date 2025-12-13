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
    const [needsProfile, setNeedsProfile] = useState(false)
    const [isChecking, setIsChecking] = useState(false)

    // Check if profile exists when account changes
    useEffect(() => {
        const checkProfile = async () => {
            if (!account || !isConfigured) {
                setNeedsProfile(false)
                return
            }

            try {
                setIsChecking(true)
                const exists = await checkUserProfileExists(account.address)
                setNeedsProfile(!exists)
            } catch (err) {
                console.error('Error checking profile existence:', err)
            } finally {
                setIsChecking(false)
            }
        }

        checkProfile()
    }, [account, isConfigured, checkUserProfileExists])

    const handleCreateProfile = async () => {
        if (!account || !isConfigured) return

        try {
            setIsCreating(true)
            setError(null)

            console.log(
                `Creating user profile for address: ${account.address.slice(0, 8)}...`
            )

            await createUserProfile()

            console.log('User profile created successfully!')
            setNeedsProfile(false)

            // Give the blockchain a moment to index the new profile
            await new Promise((resolve) => setTimeout(resolve, 1500))
        } catch (err) {
            console.error('Failed to create user profile:', err)
            setError(
                err instanceof Error ? err : new Error('Failed to create profile')
            )
        } finally {
            setIsCreating(false)
        }
    }

    return {
        isCreating,
        isChecking,
        error,
        needsProfile,
        createProfile: handleCreateProfile,
        dismissProfileCreation: () => setNeedsProfile(false),
    }
}
