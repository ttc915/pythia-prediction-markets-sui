'use client'

import { useAutoCreateProfile } from '~~/hooks/useAutoCreateProfile'

/**
 * Component that automatically creates a user profile when wallet connects.
 * Must be rendered within the provider tree to access wallet and Pythia context.
 */
export function AutoProfileCreator() {
    useAutoCreateProfile()
    return null // This component doesn't render anything
}
