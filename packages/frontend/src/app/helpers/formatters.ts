/**
 * Helper functions for Pythia prediction markets
 */
import { Market } from '~~/types/pythia.types'

export const SUI_TO_MIST = 1_000_000_000

/**
 * Convert SUI amount to MIST
 * @param sui Amount in SUI
 * @returns Amount in MIST (integer)
 */
export function suiToMist(sui: number): number {
    return Math.floor(sui * SUI_TO_MIST)
}

/**
 * Convert MIST amount to SUI
 * @param mist Amount in MIST
 * @returns Amount in SUI (float)
 */
export function mistToSui(mist: string | bigint | number): number {
    const val = typeof mist === 'string' ? BigInt(mist) : BigInt(mist)
    // Convert to number for display, careful with precision for very large numbers
    return Number(val) / SUI_TO_MIST
}

/**
 * Calculate odds percentages for a market
 * @param market The market to calculate odds for
 * @returns Object with yesPercent and noPercent
 */
export function calculateOdds(market: Market): { yesPercent: number; noPercent: number } {
    const yesAmount = BigInt(market.total_yes_amount)
    const noAmount = BigInt(market.total_no_amount)
    const total = yesAmount + noAmount

    if (total === BigInt(0)) {
        return { yesPercent: 50, noPercent: 50 }
    }

    // Convert to number for percentage calculation
    const yesNum = Number(yesAmount)
    const totalNum = Number(total)

    const yesPercent = Math.round((yesNum / totalNum) * 100)

    return {
        yesPercent,
        noPercent: 100 - yesPercent
    }
}

/**
 * Estimate potential winnings for a bet
 * @param betAmount Amount being bet in MIST
 * @param isYes Whether betting YES
 * @param market The market context
 * @returns Estimated winnings in MIST
 */
export function estimateWinnings(
    betAmount: number,
    isYes: boolean,
    market: Market
): number {
    const yesPool = BigInt(market.total_yes_amount) + (isYes ? BigInt(betAmount) : BigInt(0))
    const noPool = BigInt(market.total_no_amount) + (!isYes ? BigInt(betAmount) : BigInt(0))
    const totalPool = yesPool + noPool

    const winningPool = isYes ? yesPool : noPool

    if (winningPool === BigInt(0)) return 0

    // userShare = betAmount / winningPool
    // This is a rough estimation. In reality we should use fixed point math.
    // For UI estimation, float math is acceptable but we should be careful.

    const share = betAmount / Number(winningPool)

    // Estimate after fees (roughly 3% total)
    // 3% = 300 bps usually
    const totalPoolNum = Number(totalPool)
    const afterFees = totalPoolNum * 0.97

    return Math.floor(afterFees * share)
}
