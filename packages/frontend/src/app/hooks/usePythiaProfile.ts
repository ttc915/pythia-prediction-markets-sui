'use client'

import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { usePythia } from '~~/context/PythiaContext'
import { UserProfile, Position } from '~~/types/pythia.types'
import { useUnifiedWallet } from '~~/context/UnifiedWalletContext'

/**
 * Hook to fetch user profile
 * Automatically uses the connected wallet address if no address is provided
 */
export function usePythiaProfile(
  address?: string
): UseQueryResult<UserProfile | null, Error> {
  const { getUserProfile } = usePythia()
  const { account } = useUnifiedWallet()

  const targetAddress = address || account?.address

  return useQuery({
    queryKey: ['pythia', 'profile', targetAddress],
    queryFn: async () => {
      if (!targetAddress) {
        return null
      }
      return await getUserProfile(targetAddress)
    },
    enabled: !!targetAddress,
    staleTime: 5000, // Consider data fresh for 5 seconds
    refetchInterval: 20000, // Auto-refetch every 20 seconds
  })
}

/**
 * Hook to fetch user positions
 * Automatically uses the connected wallet address if no address is provided
 */
export function usePythiaPositions(
  address?: string
): UseQueryResult<Position[], Error> {
  const { getUserPositions } = usePythia()
  const { account } = useUnifiedWallet()

  const targetAddress = address || account?.address

  return useQuery({
    queryKey: ['pythia', 'positions', targetAddress],
    queryFn: async () => {
      if (!targetAddress) {
        return []
      }
      return await getUserPositions(targetAddress)
    },
    enabled: !!targetAddress,
    staleTime: 5000,
    refetchInterval: 20000,
  })
}

/**
 * Hook to check if user has a profile
 */
export function useHasPythiaProfile(
  address?: string
): UseQueryResult<boolean, Error> {
  const { checkUserProfileExists } = usePythia()
  const { account } = useUnifiedWallet()

  const targetAddress = address || account?.address

  return useQuery({
    queryKey: ['pythia', 'hasProfile', targetAddress],
    queryFn: async () => {
      if (!targetAddress) {
        return false
      }
      return await checkUserProfileExists(targetAddress)
    },
    enabled: !!targetAddress,
    staleTime: 10000,
  })
}
