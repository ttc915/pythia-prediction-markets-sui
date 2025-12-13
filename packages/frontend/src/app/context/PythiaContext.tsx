'use client'

import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
  useMemo,
} from 'react'
import { useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { bcs } from '@mysten/sui/bcs'
import { useUnifiedWallet } from './UnifiedWalletContext'
import useNetworkConfig from '~~/hooks/useNetworkConfig'
import {
  CreateMarketParams,
  CreateMarketResult,
  PlaceBetParams,
  PlaceBetResult,
  ClaimParams,
  ClaimResult,
  Market,
  UserProfile,
  Position,
  ProtocolConfig,
  ArbiterProfile,
  SubmitResolutionParams,
  TransactionResult,
  FileDisputeParams,
  FileDisputeResult,
  AcknowledgeDisputeWinParams,
  ApproveArbiterParams,
  RevokeArbiterParams,
  ResolveDisputeParams,
  FinalizeMarketParams,
} from '~~/types/pythia.types'

// ============================================================================
// Context Interface
// ============================================================================

interface PythiaContextValue {
  // Configuration
  packageId: string
  protocolConfigId: string
  isConfigured: boolean

  // Market Creator
  createMarket: (params: CreateMarketParams) => Promise<CreateMarketResult>

  // Bettor
  placeBet: (params: PlaceBetParams) => Promise<PlaceBetResult>
  claimWinnings: (params: ClaimParams) => Promise<ClaimResult>

  // Arbiter
  submitResolution: (
    params: SubmitResolutionParams
  ) => Promise<TransactionResult>

  // Disputer (Losing Bettor)
  fileDispute: (params: FileDisputeParams) => Promise<FileDisputeResult>
  acknowledgeDisputeWin: (
    params: AcknowledgeDisputeWinParams
  ) => Promise<TransactionResult>

  // Admin
  approveArbiter: (params: ApproveArbiterParams) => Promise<TransactionResult>
  revokeArbiter: (params: RevokeArbiterParams) => Promise<TransactionResult>
  resolveDispute: (params: ResolveDisputeParams) => Promise<TransactionResult>
  finalizeMarket: (params: FinalizeMarketParams) => Promise<TransactionResult>

  // Queries
  getMarkets: () => Promise<Market[]>
  getMarket: (marketId: string) => Promise<Market | null>
  getUserProfile: (address?: string) => Promise<UserProfile | null>
  getUserPositions: (address?: string) => Promise<Position[]>
  getProtocolConfig: () => Promise<ProtocolConfig | null>
  getArbiterProfile: (address: string) => Promise<ArbiterProfile | null>
  isAdmin: () => Promise<boolean>

  // Profile Management
  createUserProfile: () => Promise<TransactionResult>
  checkUserProfileExists: (address?: string) => Promise<boolean>

  // State
  isLoading: boolean
  error: Error | null
}

const PythiaContext = createContext<PythiaContextValue | null>(null)

// ============================================================================
// Provider Component
// ============================================================================

export function PythiaProvider({ children }: { children: ReactNode }) {
  const suiClient = useSuiClient()
  const { account, signAndExecuteTransaction } = useUnifiedWallet()
  const { useNetworkVariable } = useNetworkConfig()
  const contractPackageId = useNetworkVariable('contractPackageId')
  const protocolConfigId = useNetworkVariable('protocolConfigId')

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Module name constant
  const MODULE_NAME = 'pythia'
  const CLOCK_OBJECT_ID = '0x6'

  // Check if context is properly configured
  const isConfigured = useMemo(() => {
    return (
      contractPackageId !== '0xNOTDEFINED' &&
      protocolConfigId !== '0xNOTDEFINED'
    )
  }, [contractPackageId, protocolConfigId])

  // ============================================================================
  // Helper Functions
  // ============================================================================

  const ensureAccount = useCallback(() => {
    if (!account) {
      throw new Error('Wallet not connected. Please connect your wallet first.')
    }
    return account.address
  }, [account])

  const ensureConfigured = useCallback(() => {
    if (!isConfigured) {
      throw new Error(
        'Pythia contract not configured. Please deploy the contract and set environment variables.'
      )
    }
  }, [isConfigured])

  const handleError = useCallback((error: any, context: string) => {
    console.error(`${context}:`, error)
    const errorMessage =
      error?.message || error?.toString() || 'Unknown error occurred'
    const wrappedError = new Error(`${context}: ${errorMessage}`)
    setError(wrappedError)
    throw wrappedError
  }, [])

  // ============================================================================
  // Query Functions
  // ============================================================================

  // Result of getMarkets is hard to type precisely without more custom types,
  // but we can just use the Market[] return type
  const getMarkets = useCallback(async (): Promise<Market[]> => {
    try {
      ensureConfigured()

      // 1. Query events to find all created markets (with pagination)
      const marketIds = new Set<string>()
      let hasNextPage = true
      let cursor: any = null

      while (hasNextPage) {
        const events = await suiClient.queryEvents({
          query: {
            MoveEventType: `${contractPackageId}::${MODULE_NAME}::MarketCreatedEvent`,
          },
          order: 'descending',
          cursor,
        })

        console.log({ events })

        if (!events.data || events.data.length === 0) {
          break
        }

        events.data.forEach((event) => {
          const id = (event.parsedJson as any)?.market_id
          if (id) {
            marketIds.add(id)
          }
        })

        hasNextPage = events.hasNextPage
        cursor = events.nextCursor
      }

      if (marketIds.size === 0) {
        return []
      }

      // 2. Batch fetch market objects (chunk size of 50)
      const allMarketIds = Array.from(marketIds)
      const chunkSize = 50
      const chunks = []

      for (let i = 0; i < allMarketIds.length; i += chunkSize) {
        chunks.push(allMarketIds.slice(i, i + chunkSize))
      }

      const allObjects = await Promise.all(
        chunks.map((chunk) =>
          suiClient.multiGetObjects({
            ids: chunk,
            options: { showContent: true },
          })
        )
      )

      // Flatten results
      const objects = allObjects.flat()

      // 3. Parse and format market data
      const markets: Market[] = []

      for (const obj of objects) {
        if (obj.data?.content && (obj.data.content as any).dataType === 'moveObject') {
          const fields = (obj.data.content as any).fields
          markets.push({
            id: fields.id.id,
            version: fields.version,
            description: fields.description,
            betting_end_time: fields.betting_end_time,
            resolution_deadline: fields.resolution_deadline,
            total_yes_amount: fields.total_yes_amount,
            total_no_amount: fields.total_no_amount,
            outcome: fields.outcome ? fields.outcome : null,
            creator: fields.creator,
            creator_fee_bps: fields.creator_fee_bps,
            arbiters: fields.arbiters,
            arbiter_threshold: fields.arbiter_threshold,
            resolved: fields.resolved,
            dispute_end_time: fields.dispute_end_time,
            disputed: fields.disputed,
            finalized: fields.finalized,
          })
        }
      }

      return markets
    } catch (err) {
      console.error('Error fetching markets:', err)
      return []
    }
  }, [suiClient, contractPackageId, ensureConfigured])

  const getMarket = useCallback(
    async (marketId: string): Promise<Market | null> => {
      try {
        ensureConfigured()
        const object = await suiClient.getObject({
          id: marketId,
          options: { showContent: true },
        })

        if (!object.data || !object.data.content) {
          return null
        }

        const content = object.data.content as any
        if (content.dataType !== 'moveObject') {
          return null
        }

        const fields = content.fields
        return {
          id: fields.id.id,
          version: fields.version,
          description: fields.description,
          betting_end_time: fields.betting_end_time,
          resolution_deadline: fields.resolution_deadline,
          total_yes_amount: fields.total_yes_amount,
          total_no_amount: fields.total_no_amount,
          outcome: fields.outcome ? fields.outcome : null,
          creator: fields.creator,
          creator_fee_bps: fields.creator_fee_bps,
          arbiters: fields.arbiters,
          arbiter_threshold: fields.arbiter_threshold,
          resolved: fields.resolved,
          dispute_end_time: fields.dispute_end_time,
          disputed: fields.disputed,
          finalized: fields.finalized,
        }
      } catch (err) {
        console.error('Error fetching market:', err)
        return null
      }
    },
    [suiClient, ensureConfigured]
  )

  const getUserProfile = useCallback(
    async (address?: string): Promise<UserProfile | null> => {
      try {
        ensureConfigured()
        const targetAddress = address || account?.address
        if (!targetAddress) {
          return null
        }

        // Query for UserProfile objects owned by the address
        const objects = await suiClient.getOwnedObjects({
          owner: targetAddress,
          filter: {
            StructType: `${contractPackageId}::${MODULE_NAME}::UserProfile`,
          },
          options: { showContent: true },
        })

        if (!objects.data || objects.data.length === 0) {
          return null
        }

        const profileObject = objects.data[0]
        if (!profileObject.data || !profileObject.data.content) {
          return null
        }

        const content = profileObject.data.content as any
        const fields = content.fields

        return {
          id: fields.id.id,
          version: fields.version,
          address: fields.address,
          total_bets: fields.total_bets,
          total_wins: fields.total_wins,
          total_amount_bet: fields.total_amount_bet,
          total_amount_won: fields.total_amount_won,
          total_amount_lost: fields.total_amount_lost,
          markets_created: fields.markets_created,
          creator_earnings: fields.creator_earnings,
          disputes_filed: fields.disputes_filed,
          disputes_won: fields.disputes_won,
          last_active_timestamp: fields.last_active_timestamp,
        }
      } catch (err) {
        console.error('Error fetching user profile:', err)
        return null
      }
    },
    [suiClient, account, contractPackageId, ensureConfigured]
  )

  const getUserPositions = useCallback(
    async (address?: string): Promise<Position[]> => {
      try {
        ensureConfigured()
        const targetAddress = address || account?.address
        if (!targetAddress) {
          return []
        }

        const objects = await suiClient.getOwnedObjects({
          owner: targetAddress,
          filter: {
            StructType: `${contractPackageId}::${MODULE_NAME}::Position`,
          },
          options: { showContent: true },
        })

        if (!objects.data || objects.data.length === 0) {
          return []
        }

        return objects.data
          .filter((obj) => obj.data?.content)
          .map((obj) => {
            const content = obj.data!.content as any
            const fields = content.fields
            return {
              id: fields.id.id,
              version: fields.version,
              market_id: fields.market_id,
              owner: fields.owner,
              is_yes: fields.is_yes,
              amount: fields.amount,
              claimed: fields.claimed,
            }
          })
      } catch (err) {
        console.error('Error fetching user positions:', err)
        return []
      }
    },
    [suiClient, account, contractPackageId, ensureConfigured]
  )

  const getProtocolConfig =
    useCallback(async (): Promise<ProtocolConfig | null> => {
      try {
        ensureConfigured()
        const object = await suiClient.getObject({
          id: protocolConfigId,
          options: { showContent: true },
        })

        if (!object.data || !object.data.content) {
          return null
        }

        const content = object.data.content as any
        const fields = content.fields

        return {
          id: fields.id.id,
          version: fields.version,
          protocol_fee_bps: fields.protocol_fee_bps,
          creator_fee_bps: fields.creator_fee_bps,
          arbiter_fee_bps: fields.arbiter_fee_bps,
          min_bet_amount: fields.min_bet_amount,
          dispute_bond: fields.dispute_bond,
          dispute_period: fields.dispute_period,
          dispute_threshold: fields.dispute_threshold,
          max_disputes_per_user: fields.max_disputes_per_user,
          treasury: fields.treasury,
          admin: fields.admin,
          arbiters: fields.arbiters || {},
        }
      } catch (err) {
        console.error('Error fetching protocol config:', err)
        return null
      }
    }, [suiClient, protocolConfigId, ensureConfigured])

  const checkUserProfileExists = useCallback(
    async (address?: string): Promise<boolean> => {
      const profile = await getUserProfile(address)
      return profile !== null
    },
    [getUserProfile]
  )

  // ============================================================================
  // Transaction Functions
  // ============================================================================

  const createUserProfile =
    useCallback(async (): Promise<TransactionResult> => {
      try {
        setIsLoading(true)
        setError(null)
        ensureAccount()
        ensureConfigured()

        const tx = new Transaction()

        tx.moveCall({
          target: `${contractPackageId}::${MODULE_NAME}::create_profile_entry`,
          arguments: [],
        })

        const result = await signAndExecuteTransaction(tx)

        return {
          digest: result.digest,
          effects: result.effects,
        }
      } catch (err) {
        handleError(err, 'Failed to create user profile')
        throw err
      } finally {
        setIsLoading(false)
      }
    }, [
      contractPackageId,
      signAndExecuteTransaction,
      ensureAccount,
      ensureConfigured,
      handleError,
    ])

  const createMarket = useCallback(
    async (params: CreateMarketParams): Promise<CreateMarketResult> => {
      try {
        setIsLoading(true)
        setError(null)
        ensureAccount()
        ensureConfigured()

        const {
          description,
          bettingEndTime,
          resolutionDeadline,
          arbiters,
          arbiterThreshold,
        } = params

        // Validation
        if (bettingEndTime <= Date.now()) {
          throw new Error('Betting end time must be in the future')
        }
        if (resolutionDeadline <= bettingEndTime) {
          throw new Error('Resolution deadline must be after betting end time')
        }
        if (arbiters.length < arbiterThreshold) {
          throw new Error('Number of arbiters must be >= arbiter threshold')
        }

        const tx = new Transaction()

        tx.moveCall({
          target: `${contractPackageId}::${MODULE_NAME}::create_market_entry`,
          arguments: [
            tx.object(protocolConfigId),
            tx.pure.string(description),
            tx.pure.u64(bettingEndTime),
            tx.pure.u64(resolutionDeadline),
            tx.pure(bcs.vector(bcs.Address).serialize(arbiters)),
            tx.pure.u64(arbiterThreshold),
            tx.object(CLOCK_OBJECT_ID),
          ],
        })

        const result = await signAndExecuteTransaction(tx)

        // Extract market ID from created objects
        let marketId: string | null = null
        if (result.effects?.created) {
          const createdObjects = result.effects.created
          const marketObject = createdObjects.find(
            (obj: any) => obj.owner?.Shared
          )
          if (marketObject) {
            marketId = marketObject.reference.objectId
          }
        }

        return {
          digest: result.digest,
          marketId,
          effects: result.effects,
        }
      } catch (err) {
        handleError(err, 'Failed to create market')
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [
      contractPackageId,
      protocolConfigId,
      signAndExecuteTransaction,
      ensureAccount,
      ensureConfigured,
      handleError,
    ]
  )

  const placeBet = useCallback(
    async (params: PlaceBetParams): Promise<PlaceBetResult> => {
      try {
        setIsLoading(true)
        setError(null)
        const userAddress = ensureAccount()
        ensureConfigured()

        const { marketId, isYes, amount } = params

        // Check if user has a profile, create one if not
        const hasProfile = await checkUserProfileExists()
        let profileId: string

        if (!hasProfile) {
          console.log('Creating user profile...')
          await createUserProfile()
          // Wait a bit for the profile to be indexed
          await new Promise((resolve) => setTimeout(resolve, 2000))
          const profile = await getUserProfile()
          if (!profile) {
            throw new Error('Failed to create user profile')
          }
          profileId = profile.id
        } else {
          const profile = await getUserProfile()
          if (!profile) {
            throw new Error('Failed to fetch user profile')
          }
          profileId = profile.id
        }

        const tx = new Transaction()

        // Split coin for the bet amount
        const [coin] = tx.splitCoins(tx.gas, [amount])

        tx.moveCall({
          target: `${contractPackageId}::${MODULE_NAME}::place_bet_entry`,
          arguments: [
            tx.object(marketId),
            tx.object(protocolConfigId),
            tx.object(profileId),
            tx.pure.bool(isYes),
            coin,
            tx.object(CLOCK_OBJECT_ID),
          ],
        })

        const result = await signAndExecuteTransaction(tx)

        // Extract position ID from created objects
        let positionId: string | null = null
        if (result.effects?.created) {
          const createdObjects = result.effects.created
          const positionObject = createdObjects.find(
            (obj: any) => obj.owner?.AddressOwner === userAddress
          )
          if (positionObject) {
            positionId = positionObject.reference.objectId
          }
        }

        return {
          digest: result.digest,
          positionId,
          effects: result.effects,
        }
      } catch (err) {
        handleError(err, 'Failed to place bet')
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [
      contractPackageId,
      protocolConfigId,
      signAndExecuteTransaction,
      getUserProfile,
      createUserProfile,
      checkUserProfileExists,
      ensureAccount,
      ensureConfigured,
      handleError,
    ]
  )

  const claimWinnings = useCallback(
    async (params: ClaimParams): Promise<ClaimResult> => {
      try {
        setIsLoading(true)
        setError(null)
        ensureAccount()
        ensureConfigured()

        const { marketId, positionId } = params

        // Get user profile
        const profile = await getUserProfile()
        if (!profile) {
          throw new Error('User profile not found')
        }

        const tx = new Transaction()

        tx.moveCall({
          target: `${contractPackageId}::${MODULE_NAME}::claim_entry`,
          arguments: [
            tx.object(marketId),
            tx.object(protocolConfigId),
            tx.object(positionId),
            tx.object(profile.id),
            tx.object(CLOCK_OBJECT_ID),
          ],
        })

        const result = await signAndExecuteTransaction(tx)

        // TODO: Parse balance changes to get payout amount
        const payoutAmount = null

        return {
          digest: result.digest,
          payoutAmount,
          effects: result.effects,
        }
      } catch (err) {
        handleError(err, 'Failed to claim winnings')
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [
      contractPackageId,
      protocolConfigId,
      signAndExecuteTransaction,
      getUserProfile,
      ensureAccount,
      ensureConfigured,
      handleError,
    ]
  )

  const submitResolution = useCallback(
    async (params: SubmitResolutionParams): Promise<TransactionResult> => {
      try {
        setIsLoading(true)
        setError(null)
        ensureAccount()
        ensureConfigured()

        const { marketId, outcome } = params

        const tx = new Transaction()

        tx.moveCall({
          target: `${contractPackageId}::${MODULE_NAME}::submit_resolution_entry`,
          arguments: [
            tx.object(marketId),
            tx.object(protocolConfigId),
            tx.pure.bool(outcome),
            tx.object(CLOCK_OBJECT_ID),
          ],
        })

        const result = await signAndExecuteTransaction(tx)

        return {
          digest: result.digest,
          effects: result.effects,
        }
      } catch (err) {
        handleError(err, 'Failed to submit resolution')
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [
      contractPackageId,
      protocolConfigId,
      signAndExecuteTransaction,
      ensureAccount,
      ensureConfigured,
      handleError,
    ]
  )

  // ============================================================================
  // Disputer Functions
  // ============================================================================

  const fileDispute = useCallback(
    async (params: FileDisputeParams): Promise<FileDisputeResult> => {
      try {
        setIsLoading(true)
        setError(null)
        ensureAccount()
        ensureConfigured()

        const { marketId, positionId, reason, proposedOutcome, bondAmount } =
          params

        // Get user profile
        const profile = await getUserProfile()
        if (!profile) {
          throw new Error('User profile not found')
        }

        const tx = new Transaction()

        // Split coin for bond
        const [bondCoin] = tx.splitCoins(tx.gas, [bondAmount])

        tx.moveCall({
          target: `${contractPackageId}::${MODULE_NAME}::file_dispute_entry`,
          arguments: [
            tx.object(marketId),
            tx.object(protocolConfigId),
            tx.object(profile.id),
            bondCoin,
            tx.object(positionId),
            tx.pure.string(reason),
            tx.pure.bool(proposedOutcome),
            tx.object(CLOCK_OBJECT_ID),
          ],
        })

        const result = await signAndExecuteTransaction(tx)

        return {
          digest: result.digest,
          effects: result.effects,
        }
      } catch (err) {
        handleError(err, 'Failed to file dispute')
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [
      contractPackageId,
      protocolConfigId,
      signAndExecuteTransaction,
      getUserProfile,
      ensureAccount,
      ensureConfigured,
      handleError,
    ]
  )

  const acknowledgeDisputeWin = useCallback(
    async (params: AcknowledgeDisputeWinParams): Promise<TransactionResult> => {
      try {
        setIsLoading(true)
        setError(null)
        ensureAccount()
        ensureConfigured()

        const { marketId } = params

        // Get user profile
        const profile = await getUserProfile()
        if (!profile) {
          throw new Error('User profile not found')
        }

        const tx = new Transaction()

        tx.moveCall({
          target: `${contractPackageId}::${MODULE_NAME}::acknowledge_dispute_win_entry`,
          arguments: [tx.object(profile.id), tx.object(marketId)],
        })

        const result = await signAndExecuteTransaction(tx)

        return {
          digest: result.digest,
          effects: result.effects,
        }
      } catch (err) {
        handleError(err, 'Failed to acknowledge dispute win')
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [
      contractPackageId,
      signAndExecuteTransaction,
      getUserProfile,
      ensureAccount,
      ensureConfigured,
      handleError,
    ]
  )

  // ============================================================================
  // Admin Functions
  // ============================================================================

  const ensureAdmin = useCallback(async () => {
    const config = await getProtocolConfig()
    if (!config || !account || config.admin !== account.address) {
      throw new Error('Only admin can perform this action')
    }
    return config
  }, [getProtocolConfig, account])

  const approveArbiter = useCallback(
    async (params: ApproveArbiterParams): Promise<TransactionResult> => {
      try {
        setIsLoading(true)
        setError(null)
        ensureAccount()
        ensureConfigured()
        await ensureAdmin()

        const { arbiterAddress } = params

        const tx = new Transaction()

        tx.moveCall({
          target: `${contractPackageId}::${MODULE_NAME}::approve_arbiter_entry`,
          arguments: [
            tx.object(protocolConfigId),
            tx.pure.address(arbiterAddress),
          ],
        })

        const result = await signAndExecuteTransaction(tx)

        return {
          digest: result.digest,
          effects: result.effects,
        }
      } catch (err) {
        handleError(err, 'Failed to approve arbiter')
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [
      contractPackageId,
      protocolConfigId,
      signAndExecuteTransaction,
      ensureAccount,
      ensureConfigured,
      ensureAdmin,
      handleError,
    ]
  )

  const revokeArbiter = useCallback(
    async (params: RevokeArbiterParams): Promise<TransactionResult> => {
      try {
        setIsLoading(true)
        setError(null)
        ensureAccount()
        ensureConfigured()
        await ensureAdmin()

        const { arbiterAddress } = params

        const tx = new Transaction()

        tx.moveCall({
          target: `${contractPackageId}::${MODULE_NAME}::revoke_arbiter_entry`,
          arguments: [
            tx.object(protocolConfigId),
            tx.pure.address(arbiterAddress),
          ],
        })

        const result = await signAndExecuteTransaction(tx)

        return {
          digest: result.digest,
          effects: result.effects,
        }
      } catch (err) {
        handleError(err, 'Failed to revoke arbiter')
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [
      contractPackageId,
      protocolConfigId,
      signAndExecuteTransaction,
      ensureAccount,
      ensureConfigured,
      ensureAdmin,
      handleError,
    ]
  )

  const resolveDispute = useCallback(
    async (params: ResolveDisputeParams): Promise<TransactionResult> => {
      try {
        setIsLoading(true)
        setError(null)
        ensureAccount()
        ensureConfigured()
        await ensureAdmin()

        const { marketId, upholdDispute } = params

        const tx = new Transaction()

        tx.moveCall({
          target: `${contractPackageId}::${MODULE_NAME}::resolve_dispute_entry`,
          arguments: [
            tx.object(marketId),
            tx.object(protocolConfigId),
            tx.pure.bool(upholdDispute),
          ],
        })

        const result = await signAndExecuteTransaction(tx)

        return {
          digest: result.digest,
          effects: result.effects,
        }
      } catch (err) {
        handleError(err, 'Failed to resolve dispute')
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [
      contractPackageId,
      protocolConfigId,
      signAndExecuteTransaction,
      ensureAccount,
      ensureConfigured,
      ensureAdmin,
      handleError,
    ]
  )

  const finalizeMarket = useCallback(
    async (params: FinalizeMarketParams): Promise<TransactionResult> => {
      try {
        setIsLoading(true)
        setError(null)
        ensureConfigured()

        const { marketId } = params

        const tx = new Transaction()

        tx.moveCall({
          target: `${contractPackageId}::${MODULE_NAME}::finalize_market_entry`,
          arguments: [
            tx.object(marketId),
            tx.object(protocolConfigId),
            tx.object(CLOCK_OBJECT_ID),
          ],
        })

        const result = await signAndExecuteTransaction(tx)

        return {
          digest: result.digest,
          effects: result.effects,
        }
      } catch (err) {
        handleError(err, 'Failed to finalize market')
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [
      contractPackageId,
      protocolConfigId,
      signAndExecuteTransaction,
      ensureConfigured,
      handleError,
    ]
  )

  // ============================================================================
  // Admin Query Functions
  // ============================================================================

  const isAdmin = useCallback(async (): Promise<boolean> => {
    try {
      ensureConfigured()
      if (!account) return false

      const config = await getProtocolConfig()
      if (!config) return false

      return config.admin === account.address
    } catch (err) {
      console.error('Error checking admin status:', err)
      return false
    }
  }, [getProtocolConfig, account, ensureConfigured])

  const getArbiterProfile = useCallback(
    async (address: string): Promise<ArbiterProfile | null> => {
      try {
        ensureConfigured()
        const config = await getProtocolConfig()
        if (!config) return null

        const arbiter = config.arbiters[address]
        return arbiter || null
      } catch (err) {
        console.error('Error fetching arbiter profile:', err)
        return null
      }
    },
    [getProtocolConfig, ensureConfigured]
  )

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue: PythiaContextValue = {
    // Configuration
    packageId: contractPackageId,
    protocolConfigId,
    isConfigured,

    // Market Creator
    createMarket,

    // Bettor
    placeBet,
    claimWinnings,

    // Arbiter
    submitResolution,

    // Disputer
    fileDispute,
    acknowledgeDisputeWin,

    // Admin
    approveArbiter,
    revokeArbiter,
    resolveDispute,
    finalizeMarket,

    // Queries
    getMarkets,
    getMarket,
    getUserProfile,
    getUserPositions,
    getProtocolConfig,
    getArbiterProfile,
    isAdmin,

    // Profile Management
    createUserProfile,
    checkUserProfileExists,

    // State
    isLoading,
    error,
  }

  return (
    <PythiaContext.Provider value={contextValue}>
      {children}
    </PythiaContext.Provider>
  )
}

// ============================================================================
// Hook
// ============================================================================

export function usePythia(): PythiaContextValue {
  const context = useContext(PythiaContext)

  if (!context) {
    throw new Error('usePythia must be used within PythiaProvider')
  }

  return context
}
