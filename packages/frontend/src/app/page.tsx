'use client'

import { useState, useEffect } from 'react'
import { Button, Flex, Text, Heading, Grid } from '@radix-ui/themes'
import { Plus } from 'lucide-react'
import MarketCard from './components/MarketCard'
import CreateMarketModal from './components/CreateMarketModal'
import PlaceBetModal from './components/PlaceBetModal'
import NetworkSupportChecker from './components/NetworkSupportChecker'
import { usePythia } from '~~/context/PythiaContext'
import { Market } from '~~/types/pythia.types'

export default function Home() {
  const { getMarkets, isConfigured } = usePythia()

  const [activeTab, setActiveTab] = useState('active')
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)
  const [isBetModalOpen, setIsBetModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Real markets state
  const [markets, setMarkets] = useState<Market[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchMarkets = async () => {
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
  }

  // Fetch markets on mount and when configured
  useEffect(() => {
    fetchMarkets()
  }, [isConfigured])

  // Refresh markets periodically (every 30s)
  useEffect(() => {
    const interval = setInterval(fetchMarkets, 30000)
    return () => clearInterval(interval)
  }, [isConfigured])

  // Filter markets based on tab
  const filteredMarkets =
    activeTab === 'active'
      ? markets.filter((m) => !m.resolved)
      : markets.filter((m) => m.resolved)

  const handleOpenBetModal = (market: Market) => {
    setSelectedMarket(market)
    setIsBetModalOpen(true)
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <NetworkSupportChecker />
      <div className="container mx-auto px-4 py-8">
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
        </Flex>

        {/* Markets Grid */}
        {isLoading && markets.length === 0 ? (
          <Flex justify="center" py="9">
            <Text>Loading markets...</Text>
          </Flex>
        ) : filteredMarkets.length === 0 ? (
          <Flex
            direction="column"
            align="center"
            justify="center"
            py="9"
            className="rounded-lg border border-dashed border-slate-300 bg-white/50 dark:border-slate-700 dark:bg-slate-800/50"
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
                onBetYes={() => handleOpenBetModal(market)}
                onBetNo={() => handleOpenBetModal(market)}
              />
            ))}
          </Grid>
        )}
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
