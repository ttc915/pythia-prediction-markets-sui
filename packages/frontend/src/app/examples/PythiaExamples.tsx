/**
 * Pythia Context Usage Examples
 *
 * This file demonstrates how to use the Pythia prediction market context
 * for market creators and bettors.
 */

'use client'

import React, { useState } from 'react'
import {
  usePythia,
  usePythiaMarket,
  usePythiaProfile,
} from '~~/hooks/usePythia'

/**
 * Example: Market Creator Flow
 * Shows how to create a new prediction market
 */
export function CreateMarketExample() {
  const { createMarket, isLoading, error } = usePythia()
  const [marketId, setMarketId] = useState<string | null>(null)

  const handleCreateMarket = async () => {
    try {
      // Example: "Will it rain tomorrow in San Francisco?"
      const result = await createMarket({
        description: 'Will it rain tomorrow in San Francisco?',
        bettingEndTime: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
        resolutionDeadline: Date.now() + 48 * 60 * 60 * 1000, // 48 hours from now
        arbiters: ['0xARBITER_ADDRESS'], // Must be approved arbiters
        arbiterThreshold: 1, // Need 1 arbiter to resolve
      })

      console.log('Market created!', result.digest)
      if (result.marketId) {
        setMarketId(result.marketId)
      }
    } catch (err) {
      console.error('Failed to create market:', err)
    }
  }

  return (
    <div>
      <button onClick={handleCreateMarket} disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Market'}
      </button>
      {error && <p>Error: {error.message}</p>}
      {marketId && <p>Market ID: {marketId}</p>}
    </div>
  )
}

/**
 * Example: Bettor Flow
 * Shows how to place a bet on a market
 */
export function PlaceBetExample({ marketId }: { marketId: string }) {
  const { placeBet, isLoading, error } = usePythia()
  const { data: market } = usePythiaMarket(marketId)

  const handlePlaceBet = async (isYes: boolean) => {
    try {
      // Place a 1 SUI bet (1 SUI = 1,000,000,000 MIST)
      const result = await placeBet({
        marketId,
        isYes,
        amount: 1_000_000_000, // 1 SUI in MIST
      })

      console.log('Bet placed!', result.digest)
      console.log('Position ID:', result.positionId)
    } catch (err) {
      console.error('Failed to place bet:', err)
    }
  }

  return (
    <div>
      <h3>{market?.description}</h3>
      <div>
        <p>Total YES: {market?.total_yes_amount}</p>
        <p>Total NO: {market?.total_no_amount}</p>
      </div>
      <button onClick={() => handlePlaceBet(true)} disabled={isLoading}>
        {isLoading ? 'Betting...' : 'Bet YES'}
      </button>
      <button onClick={() => handlePlaceBet(false)} disabled={isLoading}>
        {isLoading ? 'Betting...' : 'Bet NO'}
      </button>
      {error && <p>Error: {error.message}</p>}
    </div>
  )
}

/**
 * Example: Claim Winnings
 * Shows how to claim winnings after market is finalized
 */
export function ClaimWinningsExample({
  marketId,
  positionId,
}: {
  marketId: string
  positionId: string
}) {
  const { claimWinnings, isLoading, error } = usePythia()
  const { data: market } = usePythiaMarket(marketId)

  const handleClaim = async () => {
    try {
      const result = await claimWinnings({
        marketId,
        positionId,
      })

      console.log('Claimed!', result.digest)
      console.log('Payout:', result.payoutAmount)
    } catch (err) {
      console.error('Failed to claim:', err)
    }
  }

  if (!market?.finalized) {
    return <p>Market not finalized yet</p>
  }

  return (
    <div>
      <button onClick={handleClaim} disabled={isLoading}>
        {isLoading ? 'Claiming...' : 'Claim Winnings'}
      </button>
      {error && <p>Error: {error.message}</p>}
    </div>
  )
}

/**
 * Example: Display User Profile
 * Shows how to fetch and display user profile data
 */
export function UserProfileExample() {
  const { data: profile, isLoading } = usePythiaProfile()

  if (isLoading) return <p>Loading profile...</p>
  if (!profile) return <p>No profile found</p>

  return (
    <div>
      <h3>User Stats</h3>
      <p>Total Bets: {profile.total_bets}</p>
      <p>Total Wins: {profile.total_wins}</p>
      <p>
        Win Rate:{' '}
        {(
          (parseInt(profile.total_wins) / parseInt(profile.total_bets)) *
          100
        ).toFixed(2)}
        %
      </p>
      <p>Total Amount Bet: {profile.total_amount_bet} MIST</p>
      <p>Total Amount Won: {profile.total_amount_won} MIST</p>
      <p>
        Net Profit:{' '}
        {(
          BigInt(profile.total_amount_won) - BigInt(profile.total_amount_bet)
        ).toString()}{' '}
        MIST
      </p>
    </div>
  )
}

/**
 * Example: Query Functions
 * Shows how to use various query functions
 */
export function QueryExamples() {
  const {
    getMarket,
    getUserProfile,
    getUserPositions,
    getProtocolConfig,
    getArbiterProfile,
    isAdmin,
  } = usePythia()

  const fetchExamples = async () => {
    // Fetch a specific market
    const market = await getMarket('0xMARKET_ID')
    console.log('Market:', market)

    // Fetch user profile for a specific address
    const profile = await getUserProfile('0xUSER_ADDRESS')
    console.log('Profile:', profile)

    // Fetch all positions for current user
    const positions = await getUserPositions()
    console.log('Positions:', positions)

    // Fetch protocol configuration
    const config = await getProtocolConfig()
    console.log('Protocol Config:', config)

    // Check if current user is admin
    const adminStatus = await isAdmin()
    console.log('Is Admin:', adminStatus)

    // Get arbiter profile
    const arbiter = await getArbiterProfile('0xARBITER_ADDRESS')
    console.log('Arbiter:', arbiter)
  }

  return <button onClick={fetchExamples}>Run Query Examples</button>
}

/**
 * Example: File Dispute (Disputer Flow)
 * Shows how a losing bettor can file a dispute
 */
export function FileDisputeExample({
  marketId,
  positionId,
}: {
  marketId: string
  positionId: string
}) {
  const { fileDispute, isLoading, error } = usePythia()
  const { data: market } = usePythiaMarket(marketId)

  const handleFileDispute = async () => {
    try {
      // File a dispute with a 10 SUI bond
      const result = await fileDispute({
        marketId,
        positionId,
        reason:
          'The arbiters made an incorrect decision. Weather data shows no rain.',
        proposedOutcome: true, // Propose YES (opposite of current NO)
        bondAmount: 10_000_000_000, // 10 SUI bond
      })

      console.log('Dispute filed!', result.digest)
    } catch (err) {
      console.error('Failed to file dispute:', err)
    }
  }

  if (!market?.resolved || market.finalized) {
    return <p>Cannot file dispute on this market</p>
  }

  return (
    <div>
      <h3>File Dispute</h3>
      <p>Market: {market.description}</p>
      <p>Current Outcome: {market.outcome ? 'YES' : 'NO'}</p>
      <button onClick={handleFileDispute} disabled={isLoading}>
        {isLoading ? 'Filing...' : 'File Dispute (10 SUI)'}
      </button>
      {error && <p>Error: {error.message}</p>}
    </div>
  )
}

/**
 * Example: Acknowledge Dispute Win (Disputer Flow)
 * Shows how to acknowledge a won dispute
 */
export function AcknowledgeDisputeWinExample({
  marketId,
}: {
  marketId: string
}) {
  const { acknowledgeDisputeWin, isLoading, error } = usePythia()

  const handleAcknowledge = async () => {
    try {
      const result = await acknowledgeDisputeWin({ marketId })
      console.log('Dispute win acknowledged!', result.digest)
    } catch (err) {
      console.error('Failed to acknowledge dispute win:', err)
    }
  }

  return (
    <div>
      <h3>Acknowledge Dispute Win</h3>
      <button onClick={handleAcknowledge} disabled={isLoading}>
        {isLoading ? 'Acknowledging...' : 'Acknowledge Dispute Win'}
      </button>
      {error && <p>Error: {error.message}</p>}
    </div>
  )
}

/**
 * Example: Approve Arbiter (Admin Flow)
 * Shows how admin approves an arbiter
 */
export function ApproveArbiterExample() {
  const { approveArbiter, isAdmin: checkAdmin, isLoading, error } = usePythia()
  const [arbiterAddress, setArbiterAddress] = useState('')
  const [isAdminUser, setIsAdminUser] = useState(false)

  React.useEffect(() => {
    let isMounted = true
    checkAdmin().then((result) => {
      if (isMounted) {
        setIsAdminUser(result)
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  const handleApprove = async () => {
    try {
      const result = await approveArbiter({ arbiterAddress })
      console.log('Arbiter approved!', result.digest)
      alert('Arbiter approved successfully!')
    } catch (err) {
      console.error('Failed to approve arbiter:', err)
    }
  }

  if (!isAdminUser) {
    return <p>Only admin can approve arbiters</p>
  }

  return (
    <div>
      <h3>Approve Arbiter (Admin)</h3>
      <input
        type="text"
        placeholder="Arbiter Address"
        value={arbiterAddress}
        onChange={(e) => setArbiterAddress(e.target.value)}
      />
      <button onClick={handleApprove} disabled={isLoading || !arbiterAddress}>
        {isLoading ? 'Approving...' : 'Approve Arbiter'}
      </button>
      {error && <p>Error: {error.message}</p>}
    </div>
  )
}

/**
 * Example: Resolve Dispute (Admin Flow)
 * Shows how admin resolves a dispute
 */
export function ResolveDisputeExample({ marketId }: { marketId: string }) {
  const { resolveDispute, isAdmin: checkAdmin, isLoading, error } = usePythia()
  const { data: market } = usePythiaMarket(marketId)
  const [isAdminUser, setIsAdminUser] = useState(false)

  React.useEffect(() => {
    let isMounted = true
    checkAdmin().then((result) => {
      if (isMounted) {
        setIsAdminUser(result)
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  const handleResolveDispute = async (uphold: boolean) => {
    try {
      const result = await resolveDispute({
        marketId,
        upholdDispute: uphold,
      })

      console.log('Dispute resolved!', result.digest)
      alert(`Dispute ${uphold ? 'upheld' : 'rejected'}!`)
    } catch (err) {
      console.error('Failed to resolve dispute:', err)
    }
  }

  if (!isAdminUser) {
    return <p>Only admin can resolve disputes</p>
  }

  if (!market?.disputed) {
    return <p>No active dispute on this market</p>
  }

  return (
    <div>
      <h3>Resolve Dispute (Admin)</h3>
      <p>Market: {market.description}</p>
      <button onClick={() => handleResolveDispute(true)} disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Uphold Dispute'}
      </button>
      <button onClick={() => handleResolveDispute(false)} disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Reject Dispute'}
      </button>
      {error && <p>Error: {error.message}</p>}
    </div>
  )
}

/**
 * Example: Finalize Market
 * Shows how to finalize a market after dispute period
 */
export function FinalizeMarketExample({ marketId }: { marketId: string }) {
  const { finalizeMarket, isLoading, error } = usePythia()
  const { data: market } = usePythiaMarket(marketId)
  const [currentTime] = useState(() => Date.now())

  const handleFinalize = async () => {
    try {
      const result = await finalizeMarket({ marketId })
      console.log('Market finalized!', result.digest)
      alert('Market finalized successfully!')
    } catch (err) {
      console.error('Failed to finalize market:', err)
    }
  }

  if (!market?.resolved) {
    return <p>Market must be resolved first</p>
  }

  if (market.finalized) {
    return <p>Market already finalized</p>
  }

  const disputeEndTime = parseInt(market.dispute_end_time)
  const canFinalize = currentTime > disputeEndTime && !market.disputed

  return (
    <div>
      <h3>Finalize Market</h3>
      <p>Market: {market.description}</p>
      <p>Status: {market.finalized ? 'Finalized' : 'Pending'}</p>
      {!canFinalize && (
        <p>Wait until dispute period ends or dispute is resolved</p>
      )}
      <button onClick={handleFinalize} disabled={isLoading || !canFinalize}>
        {isLoading ? 'Finalizing...' : 'Finalize Market'}
      </button>
      {error && <p>Error: {error.message}</p>}
    </div>
  )
}
