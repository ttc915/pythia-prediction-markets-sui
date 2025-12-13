'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button, Flex, Text, Heading, Grid } from '@radix-ui/themes'
import { Plus } from 'lucide-react'
import MarketCard from './components/MarketCard'
import CreateMarketModal from './components/CreateMarketModal'
import PlaceBetModal from './components/PlaceBetModal'
import NetworkSupportChecker from './components/NetworkSupportChecker'
import AdminDashboard from './components/AdminDashboard'
import { usePythia } from '~~/context/PythiaContext'
import { Market } from '~~/types/pythia.types'
import { useUnifiedWallet } from './context/UnifiedWalletContext'

export default function Home() {
  const { getMarkets, submitResolution, isConfigured } = usePythia()
  const { account } = useUnifiedWallet()

  const [activeTab, setActiveTab] = useState('active')
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)
  const [isBetModalOpen, setIsBetModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const [markets, setMarkets] = useState<Market[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchMarkets = useCallback(async () => {
    if (!isConfigured) return

    setIsLoading(true)
    try {
      const data = await getMarkets()
      setMarkets(data)
    } catch (error) {
      console.error('Failed to fetch markets:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isConfigured, getMarkets])

  useEffect(() => {
    fetchMarkets()
  }, [isConfigured, fetchMarkets])

  useEffect(() => {
    const interval = setInterval(fetchMarkets, 30000)
    return () => clearInterval(interval)
  }, [isConfigured, fetchMarkets])

  const filteredMarkets =
    activeTab === 'active'
      ? markets.filter((m) => !m.resolved)
      : activeTab === 'waiting_arbitrage'
        ? markets.filter((m) =>
            account?.address ? m.arbiters.includes(account.address) : true
          )
        : markets.filter((m) => m.resolved)

  const handleOpenBetModal = (market: Market) => {
    setSelectedMarket(market)
    setIsBetModalOpen(true)
  }

  function handleArbitrageYes(market: Market) {
    submitResolution({
      marketId: market.id,
      outcome: true,
    })
  }

  function handleArbitrageNo(market: Market) {
    submitResolution({
      marketId: market.id,
      outcome: false,
    })
  }

  return (
    <main className="relative min-h-screen rounded-md bg-slate-50 dark:bg-slate-900">
      <div className="pointer-events-none fixed inset-0 z-[-1] bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800" />
      <div className="relative z-10">
        <NetworkSupportChecker />
        <div className="container mx-auto px-4 py-8">
          <AdminDashboard />
          {/* Header */}
          <Flex justify="between" align="center" className="mb-8">
            <div>
              <Heading size="8" className="mb-2 text-slate-900 dark:text-white">
                Prediction Markets
              </Heading>
              <Text className="text-slate-600 dark:text-slate-400">
                Bet on future events and earn rewards
              </Text>
            </div>
            <Button
              size="3"
              onClick={() => setIsCreateModalOpen(true)}
              className="cursor-pointer bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" /> Create Market
            </Button>
          </Flex>

          {/* Filters */}
          <Flex gap="4" className="mb-8">
            <Button
              variant={activeTab === 'active' ? 'solid' : 'soft'}
              onClick={() => setActiveTab('active')}
            >
              Active Markets
            </Button>
            <Button
              variant={activeTab === 'resolved' ? 'solid' : 'soft'}
              onClick={() => setActiveTab('resolved')}
            >
              Resolved
            </Button>
            {account?.address && (
              <Button
                variant={activeTab === 'waiting_arbitrage' ? 'solid' : 'soft'}
                onClick={() => setActiveTab('waiting_arbitrage')}
              >
                Waiting arbitrage
              </Button>
            )}
          </Flex>

          {/* Markets Grid */}
          {isLoading && markets.length === 0 ? (
            <Flex justify="center" py="9">
              <Text>Loading markets...</Text>
            </Flex>
          ) : filteredMarkets.length === 0 && activeTab === 'active' ? (
            <Flex
              direction="column"
              align="center"
              justify="center"
              py="9"
              className="min-h-[50vh] rounded-lg border border-dashed border-slate-300 bg-white/50 dark:border-slate-700 dark:bg-slate-800/50"
            >
              <Text size="5" weight="bold" mb="2">
                No markets found
              </Text>
              <Text color="gray" mb="4">
                Be the first to create a prediction market!
              </Text>
              <Button size="3" onClick={() => setIsCreateModalOpen(true)}>
                Create Market
              </Button>
            </Flex>
          ) : filteredMarkets.length === 0 && activeTab === 'resolved' ? (
            <Flex
              direction="column"
              align="center"
              justify="center"
              py="9"
              className="min-h-[50vh] rounded-lg border border-dashed border-slate-300 bg-white/50 dark:border-slate-700 dark:bg-slate-800/50"
            >
              <Text size="5" weight="bold" mb="2">
                No markets resolved yet
              </Text>
            </Flex>
          ) : filteredMarkets.length === 0 &&
            activeTab === 'waiting_arbitrage' ? (
            <Flex
              direction="column"
              align="center"
              justify="center"
              py="9"
              className="min-h-[50vh] rounded-lg border border-dashed border-slate-300 bg-white/50 dark:border-slate-700 dark:bg-slate-800/50"
            >
              <Text size="5" weight="bold" mb="2">
                No markets to arbitrage at this moment
              </Text>
            </Flex>
          ) : (
            <Grid
              columns={{ initial: '1', sm: '2', lg: '3' }}
              gap="6"
              className="mb-8"
            >
              {filteredMarkets.map((market) => (
                <MarketCard
                  key={market.id}
                  market={market}
                  activeTab={activeTab}
                  onArbitrageYes={() => handleArbitrageYes(market)}
                  onArbitrageNo={() => handleArbitrageNo(market)}
                  onBetYes={() => handleOpenBetModal(market)}
                  onBetNo={() => handleOpenBetModal(market)}
                />
              ))}
            </Grid>
          )}
        </div>
      </div>

      {selectedMarket && (
        <PlaceBetModal
          open={isBetModalOpen}
          onOpenChange={setIsBetModalOpen}
          market={selectedMarket}
        />
      )}

      <CreateMarketModal
        open={isCreateModalOpen}
        onOpenChange={(open) => {
          setIsCreateModalOpen(open)
          if (!open) fetchMarkets() // Refresh list after closing create modal
        }}
      />
    </main>
  )
}
