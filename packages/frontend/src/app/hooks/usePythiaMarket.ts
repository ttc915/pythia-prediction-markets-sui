'use client'

import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { usePythia } from '~~/context/PythiaContext'
import { Market } from '~~/types/pythia.types'

/**
 * Hook to fetch and subscribe to market data
 * Uses React Query for caching and auto-refetch
 */
export function usePythiaMarket(
    marketId: string | null | undefined
): UseQueryResult<Market | null, Error> {
    const { getMarket } = usePythia()

    return useQuery({
        queryKey: ['pythia', 'market', marketId],
        queryFn: async () => {
            if (!marketId) {
                return null
            }
            return await getMarket(marketId)
        },
        enabled: !!marketId,
        staleTime: 10000, // Consider data fresh for 10 seconds
        refetchInterval: 30000, // Auto-refetch every 30 seconds
    })
}

/**
 * Hook to fetch multiple markets by their IDs
 */
export function usePythiaMarkets(
    marketIds: string[]
): UseQueryResult<(Market | null)[], Error> {
    const { getMarket } = usePythia()

    return useQuery({
        queryKey: ['pythia', 'markets', marketIds],
        queryFn: async () => {
            if (!marketIds || marketIds.length === 0) {
                return []
            }
            return await Promise.all(marketIds.map((id) => getMarket(id)))
        },
        enabled: marketIds && marketIds.length > 0,
        staleTime: 10000,
        refetchInterval: 30000,
    })
}
