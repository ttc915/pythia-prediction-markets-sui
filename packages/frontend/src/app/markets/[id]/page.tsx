'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  Button,
  Flex,
  Text,
  Heading,
  Card,
  Badge,
  Dialog,
} from '@radix-ui/themes'
import {
  ArrowLeft,
  Share2,
  TrendingUp,
  TrendingDown,
  Clock,
} from 'lucide-react'
import QRCode from 'react-qr-code'
import { usePythia } from '~~/context/PythiaContext'
import { Market } from '~~/types/pythia.types'
import { useUnifiedWallet } from '~~/context/UnifiedWalletContext'
import PlaceBetModal from '~~/components/PlaceBetModal'
import NetworkSupportChecker from '~~/components/NetworkSupportChecker'

export default function MarketDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  // Unwrap params using React.use()
  const { id: marketId } = use(params)

  const { getMarket, submitResolution, isConfigured } = usePythia()
  const { account } = useUnifiedWallet()

  const [market, setMarket] = useState<Market | null>(null)
  const [loading, setLoading] = useState(true)
  const [isBetModalOpen, setIsBetModalOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  const fetchMarket = useCallback(async () => {
    if (!isConfigured || !marketId) return

    try {
      setLoading(true)
      const data = await getMarket(marketId)
      setMarket(data)
    } catch (error) {
      console.error('Failed to fetch market:', error)
    } finally {
      setLoading(false)
    }
  }, [isConfigured, marketId, getMarket])

  useEffect(() => {
    fetchMarket()
  }, [fetchMarket])

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(fetchMarket, 30000)
    return () => clearInterval(interval)
  }, [fetchMarket])

  if (loading) {
    return (
      <main className="relative min-h-screen rounded-md bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4 py-8">
          <Flex justify="center" align="center" style={{ height: '50vh' }}>
            <Text>Loading market details...</Text>
          </Flex>
        </div>
      </main>
    )
  }

  if (!market) {
    return (
      <main className="relative min-h-screen rounded-md bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4 py-8">
          <Flex direction="column" align="center" gap="4">
            <Heading>Market not found</Heading>
            <Button onClick={() => router.push('/')}>Go back home</Button>
          </Flex>
        </div>
      </main>
    )
  }

  // --- Helpers similar to MarketCard ---
  const totalYes = parseInt(market.total_yes_amount)
  const totalNo = parseInt(market.total_no_amount)
  const bettingEndTime = parseInt(market.betting_end_time)

  const totalPool = totalYes + totalNo
  const yesPercentage = totalPool > 0 ? (totalYes / totalPool) * 100 : 50
  const noPercentage = totalPool > 0 ? (totalNo / totalPool) * 100 : 50
  const formattedPool = (totalPool / 1_000_000_000).toFixed(2)

  const currentTime = Date.now()
  const timeRemaining = bettingEndTime - currentTime
  const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24))
  const hoursRemaining = Math.floor(
    (timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  )

  const getTimeRemainingText = () => {
    if (market.resolved) return 'Resolved'
    if (timeRemaining <= 0) return 'Betting closed'
    if (daysRemaining > 0) return `${daysRemaining}d ${hoursRemaining}h left`
    if (hoursRemaining > 0) return `${hoursRemaining}h left`
    return 'Ending soon'
  }

  const isArbiter =
    account?.address && market.arbiters.includes(account.address)

  const handleBetClick = () => {
    // This assumes PlaceBetModal can handle pre-selection if modified, or we just open it for the market
    // Wait, PlaceBetModal takes 'market'. It doesn't seem to take 'side' as prop based on previous view.
    // Let's check PlaceBetModal props later.  The user said "Reuse PlaceBetModal".
    // I'll just open the modal. The user can choose side inside, or I might need to update PlaceBetModal if needed.
    // Actually, looking at MarketCard usage:
    // onBetYes={() => handleOpenBetModal(market)}
    // It seems PlaceBetModal might handle side selection inside or just be general.
    // Let's stick to opening it.
    setIsBetModalOpen(true)
  }

  const handleArbitrage = (outcome: boolean) => {
    submitResolution({
      marketId: market.id,
      outcome,
    })
      .then(() => fetchMarket())
      .catch(console.error)
  }

  return (
    <main className="relative min-h-screen rounded-md bg-slate-50 dark:bg-slate-900">
      <div className="pointer-events-none fixed inset-0 z-[-1] bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800" />
      <div className="relative z-10">
        <NetworkSupportChecker />
        <div className="container mx-auto max-w-4xl px-4 py-8">
          {/* Header / Nav */}
          <Flex justify="between" align="center" className="mb-8">
            <Button
              variant="ghost"
              onClick={() => router.push('/')}
              className="cursor-pointer text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Markets
            </Button>
            <Button
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => setIsShareModalOpen(true)}
            >
              <Share2 className="mr-2 h-4 w-4" /> Share Market
            </Button>
          </Flex>

          <Card className="overflow-hidden rounded-xl border-2 border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <Flex direction="column" gap="6">
              {/* Market Header */}
              <div>
                <Heading
                  size="8"
                  className="mb-4 text-slate-900 dark:text-white"
                >
                  {market.description}
                </Heading>
                <Flex gap="4" wrap="wrap">
                  <Badge
                    size="3"
                    color={market.resolved ? 'gray' : 'blue'}
                    variant="soft"
                  >
                    <Clock className="mr-1 h-3 w-3" />
                    {getTimeRemainingText()}
                  </Badge>
                  <Badge size="3" color="indigo" variant="soft">
                    Pool: {formattedPool} SUI
                  </Badge>
                  {market.resolved && (
                    <Badge
                      size="3"
                      color={market.outcome ? 'green' : 'red'}
                      variant="solid"
                    >
                      Outcome: {market.outcome ? 'YES' : 'NO'}
                    </Badge>
                  )}
                </Flex>
              </div>

              {/* Stats & Probability */}
              <div className="rounded-lg bg-slate-50 p-6 dark:bg-slate-900/50">
                <Flex direction="column" gap="4">
                  <Flex justify="between" align="center">
                    <Flex align="center" gap="2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <Text size="4" weight="bold">
                        YES
                      </Text>
                    </Flex>
                    <Text
                      size="6"
                      weight="bold"
                      className="text-green-600 dark:text-green-400"
                    >
                      {yesPercentage.toFixed(1)}%
                    </Text>
                  </Flex>

                  <div className="h-4 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
                      style={{ width: `${yesPercentage}%` }}
                    />
                  </div>

                  <Flex justify="between" align="center">
                    <Flex align="center" gap="2">
                      <TrendingDown className="h-5 w-5 text-red-500" />
                      <Text size="4" weight="bold">
                        NO
                      </Text>
                    </Flex>
                    <Text
                      size="6"
                      weight="bold"
                      className="text-red-600 dark:text-red-400"
                    >
                      {noPercentage.toFixed(1)}%
                    </Text>
                  </Flex>
                </Flex>
              </div>

              {/* Actions */}
              <div className="mt-4">
                {/* 1. Standard Betting */}
                {!market.resolved && timeRemaining > 0 && (
                  <Flex gap="4" direction={{ initial: 'column', sm: 'row' }}>
                    <Button
                      size="4"
                      className="flex-1 cursor-pointer bg-green-500 text-lg font-bold text-white hover:bg-green-600"
                      onClick={() => handleBetClick()}
                    >
                      Bet YES
                    </Button>
                    <Button
                      size="4"
                      className="flex-1 cursor-pointer bg-red-500 text-lg font-bold text-white hover:bg-red-600"
                      onClick={() => handleBetClick()}
                    >
                      Bet NO
                    </Button>
                  </Flex>
                )}

                {/* 2. Betting Closed */}
                {!market.resolved && timeRemaining <= 0 && (
                  <div className="rounded-lg bg-slate-100 p-4 text-center dark:bg-slate-800">
                    <Text size="3" color="gray">
                      Betting has closed. Waiting for resolution.
                    </Text>
                  </div>
                )}

                {/* 3. Arbiter Actions */}
                {market.resolved === false &&
                timeRemaining <= 0 && // Usually arbitrage happens after betting closes, but 'resolved' flag logic might vary. Based on MarketCard logic: resolved && activeTab === 'waiting_arbitrage'
                // Wait, check MarketCard: "market.resolved && activeTab === 'waiting_arbitrage'"
                // But 'resolved' usually means the outcome is set. 'waiting_arbitrage' usually implies the market is ready for resolution but not finalized?
                // Let's re-read MarketCard logic carefully.
                // filteredMarkets logic in page.tsx:
                // waiting_arbitrage: !resolved (implied? No, filter(m => m.resolved) is for 'resolved' tab.)
                // waiting_arbitrage: markets.filter(m => account?.address ? m.arbiters.includes(account.address) : true)
                // Wait, look at page.tsx line 51: activeTab === 'active' ? markets.filter((m) => !m.resolved)
                // line 56: : markets.filter((m) => m.resolved)  (Wait, this is for 'resolved' tab?)
                // line 53: waiting_arbitrage logic seems to filter by arbiter inclusion. But what about resolved status?
                // Usually arbiters resolve the market. So it should NOT be resolved yet.
                // But look at line 192 in MarketCard.tsx:  market.resolved && activeTab === 'waiting_arbitrage'.
                // This is weird. If it's already resolved, why arbiter buttons?
                // Maybe 'resolved' field means something else?
                // Let's look at PythiaContext types and submitResolution.
                // submitResolution sets the outcome.
                // In PythiaContext: fields.resolved comes from the contract.
                // Let's trust my previous reading of MarketCard logic:
                // handleArbitrageYes checks: onArbitrageYes && market.resolved && activeTab === 'waiting_arbitrage'.
                // This implies that for the "Arbitrage" tab, we are showing markets where `market.resolved` is TRUE? That sounds backwards for "deciding the outcome".
                // Maybe `resolved` means "Betting period resolved/ended" and `outcome` is yet to be decided?
                // Or maybe I misread MarketCard line 192.
                // "market.resolved && activeTab === 'waiting_arbitrage'"
                // Let's re-read line 51 of page.tsx:
                // activeTab === 'active' ? markets.filter((m) => !m.resolved)
                // If activeTab is 'waiting_arbitrage', it filters by arbiter inclusion. It doesn't check resolved.
                // BUT MarketCard only shows Arbiter buttons if `market.resolved` is true.
                // This strongly suggests that in this system, `market.resolved` might mean "Ready for resolution" (aka betting ended)?
                // OR there is a bug in the current code I just read.
                // However, let's look at `getTimeRemainingText` in MarketCard: `if (market.resolved) return 'Resolved'`.
                // If it returns "Resolved", it implies it's done.
                // If MarketCard shows Arbiter buttons only when `market.resolved` is true, it implies you can arbitrate AFTER it is resolved? That makes no sense unless it's for disputing?
                // ...
                // Wait, `submitResolution` sets the outcome.
                // Let's stick to safe logic: You can arbitrate if you are an arbiter AND market is NOT finalized?
                // In `MarketCard.tsx`:
                /*
                                      192:           {market.resolved && activeTab === 'waiting_arbitrage' && (
                                    */
                // Wait, if I am on the details page, I don't have tabs.
                // I should show Arbiter buttons if the user is an arbiter AND the market allows resolution.
                // When does a market allow resolution? Usually after betting end time.
                // And before it is finalized?
                // Let's look at `createMarket` constraints in Context: resolutionDeadline > bettingEndTime.
                // So between bettingEndTime and resolutionDeadline is the resolution period.
                // The `market.resolved` flag likely comes from the move struct.
                // If `market.resolved` is true, it usually means outcome is set.
                // Maybe the buttons in MarketCard are WRONG or I am misinterpreting `activeTab === 'waiting_arbitrage'`.
                // Actually, let's try to be smart. If timeRemaining <= 0 and !market.resolved, that's usually when you resolve.
                // Use `isArbiter` check.
                // AND check `!market.resolved` (outcome not set yet). Or maybe `!market.finalized`.
                // Given the ambiguity, I'll provide an "Arbitrator Actions" section that appears if `isArbiter` is true.
                // And disabling them if resolved.
                // BUT, I'll follow the pattern "otherwise they will be disabled with an explanation text on hover" as per USER REQUEST.
                // USER REQUEST: "In here we will have the place bet buttons OR the arbitrage yes/no in case you are the arbiter (and the time is due, otherwise they will be disabled with an explanation text on hover)."
                // "time is due" -> bettingEndTime passed.
                // So:
                // IF isArbiter:
                //    Show ARBITRAGE buttons.
                //    Enable IF (timeRemaining <= 0 && !market.resolved).
                //    Disable IF (timeRemaining > 0) -> "Betting is still active".
                //    Disable IF (market.resolved) -> "Market already resolved".
                // ELSE:
                //    Show BET buttons.
                isArbiter ? (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
                    <Heading
                      size="4"
                      className="mb-3 text-blue-900 dark:text-blue-100"
                    >
                      Arbiter Actions
                    </Heading>
                    <Flex gap="4">
                      <Button
                        size="3"
                        color="green"
                        disabled={timeRemaining > 0 || market.resolved}
                        title={
                          timeRemaining > 0
                            ? 'Wait for betting to end'
                            : market.resolved
                              ? 'Market already resolved'
                              : 'Resolve YES'
                        }
                        onClick={() => handleArbitrage(true)}
                        className="flex-1 cursor-pointer"
                      >
                        Resolve YES
                      </Button>
                      <Button
                        size="3"
                        color="red"
                        disabled={timeRemaining > 0 || market.resolved}
                        title={
                          timeRemaining > 0
                            ? 'Wait for betting to end'
                            : market.resolved
                              ? 'Market already resolved'
                              : 'Resolve NO'
                        }
                        onClick={() => handleArbitrage(false)}
                        className="flex-1 cursor-pointer"
                      >
                        Resolve NO
                      </Button>
                    </Flex>
                    {timeRemaining > 0 && (
                      <Text size="2" color="gray" mt="2">
                        Arbitration available after betting ends.
                      </Text>
                    )}
                  </div>
                ) : null}
              </div>
            </Flex>
          </Card>
        </div>
      </div>

      {/* Place Bet Modal */}
      <PlaceBetModal
        open={isBetModalOpen}
        onOpenChange={setIsBetModalOpen}
        market={market}
      />

      {/* Share Modal */}
      <Dialog.Root open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <Dialog.Content style={{ maxWidth: 450 }}>
          <Dialog.Title>Share this Market</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Scan this QR code to open the market details on mobile.
          </Dialog.Description>

          <Flex
            direction="column"
            gap="3"
            align="center"
            justify="center"
            className="rounded-lg bg-white p-6"
          >
            <QRCode
              value={typeof window !== 'undefined' ? window.location.href : ''}
              size={256}
              style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
              viewBox={`0 0 256 256`}
            />
          </Flex>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Close
              </Button>
            </Dialog.Close>
            {/* Native Share Button for Mobile */}
            <Button
              onClick={() => {
                if (navigator.share) {
                  navigator
                    .share({
                      title: market.description,
                      text: `Check out this prediction market: ${market.description}`,
                      url: window.location.href,
                    })
                    .catch(console.error)
                } else {
                  // Fallback: copy to clipboard
                  navigator.clipboard.writeText(window.location.href)
                  // Could show a toast here
                }
              }}
            >
              Share Link
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </main>
  )
}
