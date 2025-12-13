/**
 * Pythia Prediction Market Type Definitions
 * These types mirror the Move contract structs from pythia::pythia
 */

// ============================================================================
// Move Struct Types
// ============================================================================

export interface Market {
  id: string
  version: string
  description: string
  betting_end_time: string
  resolution_deadline: string
  total_yes_amount: string
  total_no_amount: string
  outcome: boolean | null
  creator: string
  creator_fee_bps: string
  arbiters: string[]
  arbiter_threshold: string
  resolved: boolean
  dispute_end_time: string
  disputed: boolean
  finalized: boolean
}

export interface UserProfile {
  id: string
  version: string
  address: string
  total_bets: string
  total_wins: string
  total_amount_bet: string
  total_amount_won: string
  total_amount_lost: string
  markets_created: string
  creator_earnings: string
  disputes_filed: string
  disputes_won: string
  last_active_timestamp: string
}

export interface Position {
  id: string
  version: string
  market_id: string
  owner: string
  is_yes: boolean
  amount: string
  claimed: boolean
}

export interface ArbiterProfile {
  version: string
  address: string
  total_resolutions: string
  correct_resolutions: string
  approved: boolean
  last_active_timestamp: string
  total_earnings: string
}

export interface ProtocolConfig {
  id: string
  version: string
  protocol_fee_bps: string
  creator_fee_bps: string
  arbiter_fee_bps: string
  min_bet_amount: string
  dispute_bond: string
  dispute_period: string
  dispute_threshold: string
  max_disputes_per_user: string
  treasury: string
  admin: string
  arbiters: Record<string, ArbiterProfile>
}

// ============================================================================
// Function Parameter Types
// ============================================================================

export interface CreateMarketParams {
  description: string
  bettingEndTime: number // Unix timestamp in milliseconds
  resolutionDeadline: number // Unix timestamp in milliseconds
  arbiters: string[] // Array of arbiter addresses
  arbiterThreshold: number // Minimum votes needed for consensus
}

export interface PlaceBetParams {
  marketId: string
  isYes: boolean
  amount: number // Amount in MIST (1 SUI = 1,000,000,000 MIST)
}

export interface ClaimParams {
  marketId: string
  positionId: string
}

export interface SubmitResolutionParams {
  marketId: string
  outcome: boolean
}

export interface FileDisputeParams {
  marketId: string
  positionId: string
  reason: string
  proposedOutcome: boolean
  bondAmount: number // Amount in MIST
}

export interface AcknowledgeDisputeWinParams {
  marketId: string
}

export interface ApproveArbiterParams {
  arbiterAddress: string
}

export interface RevokeArbiterParams {
  arbiterAddress: string
}

export interface ResolveDisputeParams {
  marketId: string
  upholdDispute: boolean // true = uphold dispute, false = reject
}

export interface FinalizeMarketParams {
  marketId: string
}

// ============================================================================
// Function Result Types
// ============================================================================

export interface CreateMarketResult {
  digest: string
  marketId: string | null
  effects: any
}

export interface PlaceBetResult {
  digest: string
  positionId: string | null
  effects: any
}

export interface ClaimResult {
  digest: string
  payoutAmount: string | null
  effects: any
}

export interface TransactionResult {
  digest: string
  effects: any
}

export interface FileDisputeResult {
  digest: string
  effects: any
}

// ============================================================================
// Event Types (for event parsing)
// ============================================================================

export interface EventMarketCreated {
  market_id: string
  creator: string
  description: string
  betting_end_time: string
  timestamp: string
}

export interface EventBetPlaced {
  market_id: string
  bettor: string
  is_yes: boolean
  amount: string
  new_yes_total: string
  new_no_total: string
  timestamp: string
}

export interface EventMarketResolved {
  market_id: string
  outcome: boolean
  total_pool: string
  timestamp: string
}

export interface EventWinningsClaimed {
  market_id: string
  user: string
  amount: string
  timestamp: string
}

export interface EventDisputeFiled {
  market_id: string
  dispute_id: string
  challenger: string
  timestamp: string
}

// ============================================================================
// UI Helper Types
// ============================================================================

export interface MarketWithStats extends Market {
  totalPool: bigint
  yesPercentage: number
  noPercentage: number
  timeUntilBettingEnds: number
  timeUntilResolution: number
  status: 'active' | 'betting_closed' | 'resolved' | 'disputed' | 'finalized'
}

export interface UserStats {
  totalBets: number
  totalWins: number
  winRate: number
  totalAmountBet: bigint
  totalAmountWon: bigint
  totalAmountLost: bigint
  netProfit: bigint
  marketsCreated: number
  creatorEarnings: bigint
}
