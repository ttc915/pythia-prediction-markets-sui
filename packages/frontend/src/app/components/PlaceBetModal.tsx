'use client'

import { useState, useEffect } from 'react'
import { Dialog, Button, Flex, Text } from '@radix-ui/themes'
import { Wallet, Check, AlertCircle, TrendingUp } from 'lucide-react'
import { useSuiClient } from '@mysten/dapp-kit'
import { usePythia } from '~~/hooks/usePythia'
import { useUnifiedWallet } from '~~/context/UnifiedWalletContext'
import { Market } from '~~/types/pythia.types'
import {
  suiToMist,
  mistToSui,
  calculateOdds,
  estimateWinnings,
} from '~~/helpers/formatters'
import ConnectModal from './ConnectModal'

interface PlaceBetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  market: Market
}

export default function PlaceBetModal({
  open,
  onOpenChange,
  market,
}: PlaceBetModalProps) {
  const {
    placeBet,
    getProtocolConfig,
    isLoading: isPythiaLoading,
  } = usePythia()
  const { account, loginWithGoogle } = useUnifiedWallet()
  const suiClient = useSuiClient()

  // Form State
  const [betSide, setBetSide] = useState<'yes' | 'no' | null>(null)
  const [amount, setAmount] = useState<string>('')

  // UI State
  const [connectModalOpen, setConnectModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [positionId, setPositionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [balance, setBalance] = useState<bigint>(BigInt(0))

  // Config State
  const [minBetAmount, setMinBetAmount] = useState<number>(0)

  // Derived State
  const odds = calculateOdds(market)
  const mistAmount = amount ? suiToMist(parseFloat(amount)) : 0
  const estimatedWinnings = betSide
    ? estimateWinnings(mistAmount, betSide === 'yes', market)
    : 0

  // Fetch balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (account?.address && open) {
        try {
          const coinBalance = await suiClient.getBalance({
            owner: account.address,
          })
          setBalance(BigInt(coinBalance.totalBalance))
        } catch (err) {
          console.error('Failed to fetch balance:', err)
        }
      }
    }
    fetchBalance()
  }, [account, open, suiClient])

  // Fetch protocol config for min bet
  useEffect(() => {
    if (open) {
      getProtocolConfig().then((config) => {
        if (config) {
          setMinBetAmount(parseInt(config.min_bet_amount))
        }
      })
    }
  }, [open, getProtocolConfig])

  // Reset state when opening/closing
  useEffect(() => {
    if (!open) {
      // Small delay to reset after animation
      const timer = setTimeout(() => {
        setBetSide(null)
        setAmount('')
        setSuccess(false)
        setPositionId(null)
        setError(null)
        setIsSubmitting(false)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [open])

  const handleConnect = () => {
    setConnectModalOpen(true)
  }

  const handlePlaceBet = async () => {
    if (!account) {
      handleConnect()
      return
    }

    if (!betSide || !amount) return

    const amountVal = parseFloat(amount)
    if (isNaN(amountVal) || amountVal <= 0) {
      setError('Please enter a valid amount')
      return
    }

    const amountMist = suiToMist(amountVal)
    if (amountMist < minBetAmount) {
      setError(`Minimum bet is ${mistToSui(minBetAmount)} SUI`)
      return
    }

    if (BigInt(amountMist) > balance) {
      setError('Insufficient balance')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      const result = await placeBet({
        marketId: market.id,
        isYes: betSide === 'yes',
        amount: amountMist,
      })

      console.log({ result, message: 'Bet placed result' })
      if (result.positionId) {
        setPositionId(result.positionId)
        setSuccess(true)
      } else {
        throw new Error('Failed to create position')
      }
    } catch (err: any) {
      console.error('Bet failed:', err)
      setError(err.message || 'Failed to place bet')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Success View
  if (success) {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Content maxWidth="450px">
          <Flex direction="column" gap="4" align="center" className="py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>

            <Text
              size="5"
              weight="bold"
              className="text-center text-green-600 dark:text-green-400"
            >
              Bet Placed Successfully!
            </Text>

            <Text
              size="3"
              className="text-center text-slate-600 dark:text-slate-400"
            >
              You bet <span className="font-bold">{amount} SUI</span> on{' '}
              <span
                className={`font-bold ${betSide === 'yes' ? 'text-green-600' : 'text-red-600'}`}
              >
                {betSide?.toUpperCase()}
              </span>
            </Text>

            {positionId && (
              <Text size="1" className="text-slate-400">
                Position ID: {positionId.slice(0, 8)}...{positionId.slice(-6)}
              </Text>
            )}

            <Button
              size="3"
              className="mt-4 w-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    )
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Content maxWidth="500px">
          <Dialog.Title className="mb-2 text-xl font-bold">
            Place Bet
          </Dialog.Title>

          <Dialog.Description className="mb-6 text-slate-500">
            {market.description}
          </Dialog.Description>

          <Flex direction="column" gap="5">
            {/* Side Selection */}
            <Flex gap="3">
              <button
                className={`flex-1 rounded-xl border-2 p-4 transition-all ${
                  betSide === 'yes'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-slate-200 hover:border-green-200 dark:border-slate-700'
                }`}
                onClick={() => setBetSide('yes')}
              >
                <Flex direction="column" align="center" gap="1">
                  <Text
                    weight="bold"
                    size="5"
                    className="text-green-600 dark:text-green-400"
                  >
                    YES
                  </Text>
                  <Text size="2" className="text-slate-500">
                    {odds.yesPercent}% chance
                  </Text>
                </Flex>
              </button>

              <button
                className={`flex-1 rounded-xl border-2 p-4 transition-all ${
                  betSide === 'no'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-slate-200 hover:border-red-200 dark:border-slate-700'
                }`}
                onClick={() => setBetSide('no')}
              >
                <Flex direction="column" align="center" gap="1">
                  <Text
                    weight="bold"
                    size="5"
                    className="text-red-600 dark:text-red-400"
                  >
                    NO
                  </Text>
                  <Text size="2" className="text-slate-500">
                    {odds.noPercent}% chance
                  </Text>
                </Flex>
              </button>
            </Flex>

            {/* Amount Input */}
            <div>
              <div className="mb-2 flex justify-between">
                <Text size="2" weight="bold">
                  Amount (SUI)
                </Text>
                {account && (
                  <Text size="2" className="text-slate-500">
                    Balance: {mistToSui(balance).toFixed(2)} SUI
                  </Text>
                )}
              </div>

              <div className="relative">
                <input
                  className="w-full rounded-md border border-slate-300 bg-white p-2 pr-12 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
                  placeholder="0.0"
                  type="number"
                  min="0"
                  step="0.1"
                  value={amount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAmount(e.target.value)
                  }
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  SUI
                </div>
              </div>

              <Text size="1" color="gray" className="mt-1">
                Minimum bet: {mistToSui(minBetAmount)} SUI
              </Text>
            </div>

            {/* Estimates */}
            {amount && betSide && (
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
                <Flex justify="between" align="center" className="mb-2">
                  <Text size="2" className="text-slate-600 dark:text-slate-400">
                    Estimated Winnings
                  </Text>
                  <Flex align="center" gap="1">
                    <TrendingUp size={16} className="text-green-600" />
                    <Text weight="bold" className="text-green-600">
                      ~{mistToSui(estimatedWinnings).toFixed(2)} SUI
                    </Text>
                  </Flex>
                </Flex>
                <Flex justify="between" align="center">
                  <Text size="2" className="text-slate-600 dark:text-slate-400">
                    Potential ROI
                  </Text>
                  <Text weight="bold">
                    {(
                      (estimateWinnings(mistAmount, betSide === 'yes', market) /
                        mistAmount -
                        1) *
                      100
                    ).toFixed(0)}
                    %
                  </Text>
                </Flex>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                <AlertCircle size={16} />
                <Text size="2">{error}</Text>
              </div>
            )}

            {/* Actions */}
            {!account ? (
              <Button
                size="4"
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleConnect}
              >
                <Wallet size={18} />
                Connect Wallet to Bet
              </Button>
            ) : (
              <Button
                size="4"
                className={`w-full ${
                  betSide === 'yes'
                    ? 'bg-green-600 hover:bg-green-700'
                    : betSide === 'no'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-slate-900 dark:bg-white dark:text-slate-900'
                }`}
                disabled={
                  !betSide || !amount || isSubmitting || isPythiaLoading
                }
                onClick={handlePlaceBet}
              >
                {isSubmitting ? 'Placing Bet...' : 'Place Bet'}
              </Button>
            )}

            <Button
              variant="ghost"
              color="gray"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <ConnectModal
        open={connectModalOpen}
        onOpenChange={setConnectModalOpen}
        onZKLoginClick={loginWithGoogle}
      />
    </>
  )
}
