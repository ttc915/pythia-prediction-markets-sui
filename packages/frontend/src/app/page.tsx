'use client'

import { useState } from 'react'
import { Button, Flex, Text } from '@radix-ui/themes'
import { Plus } from 'lucide-react'
import MarketCard from './components/MarketCard'
import CreateMarketModal from './components/CreateMarketModal'
import NetworkSupportChecker from './components/NetworkSupportChecker'

// Mock data for MVP
const mockMarkets = [
  {
    id: '1',
    description: 'Will Ethereum reach $5,000 by the end of 2025?',
    totalYesAmount: 50_000_000_000, // 50 SUI
    totalNoAmount: 30_000_000_000, // 30 SUI
    bettingEndTime: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    resolved: false,
    outcome: null,
  },
  {
    id: '2',
    description: 'Will Bitcoin surpass $150,000 in 2025?',
    totalYesAmount: 75_000_000_000, // 75 SUI
    totalNoAmount: 45_000_000_000, // 45 SUI
    bettingEndTime: Date.now() + 60 * 24 * 60 * 60 * 1000, // 60 days
    resolved: false,
    outcome: null,
  },
  {
    id: '3',
    description: 'Will it rain in San Francisco tomorrow?',
    totalYesAmount: 10_000_000_000, // 10 SUI
    totalNoAmount: 15_000_000_000, // 15 SUI
    bettingEndTime: Date.now() + 1 * 24 * 60 * 60 * 1000, // 1 day
    resolved: false,
    outcome: null,
  },
  {
    id: '4',
    description: 'Will the US stock market close higher this week?',
    totalYesAmount: 40_000_000_000, // 40 SUI
    totalNoAmount: 20_000_000_000, // 20 SUI
    bettingEndTime: Date.now() + 5 * 24 * 60 * 60 * 1000, // 5 days
    resolved: false,
    outcome: null,
  },
  {
    id: '5',
    description: 'Will Solana reach $300 before June 2025?',
    totalYesAmount: 35_000_000_000, // 35 SUI
    totalNoAmount: 45_000_000_000, // 45 SUI
    bettingEndTime: Date.now() + 90 * 24 * 60 * 60 * 1000, // 90 days
    resolved: false,
    outcome: null,
  },
  {
    id: '6',
    description: 'Will AI replace software engineers by 2030?',
    totalYesAmount: 20_000_000_000, // 20 SUI
    totalNoAmount: 60_000_000_000, // 60 SUI
    bettingEndTime: Date.now() + 365 * 24 * 60 * 60 * 1000, // 365 days
    resolved: false,
    outcome: null,
  },
]

export default function Home() {
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const handleBetYes = (marketId: string) => {
    console.log('Bet YES on market:', marketId)
    // TODO: Implement bet modal
  }

  const handleBetNo = (marketId: string) => {
    console.log('Bet NO on market:', marketId)
    // TODO: Implement bet modal
  }

  return (
    <>
      <NetworkSupportChecker />

      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <Flex direction="column" gap="6" className="mb-8">
          <Flex justify="between" align="center" wrap="wrap" gap="4">
            <div>
              <Text size="8" weight="bold" className="text-slate-900 dark:text-white">
                Prediction Markets
              </Text>
              <Text size="3" className="text-slate-600 dark:text-slate-400 mt-1">
                Bet on the future with Pythia
              </Text>
            </div>

            <Button
              size="3"
              className="bg-blue-500 hover:bg-blue-600 text-white"
              onClick={() => setCreateModalOpen(true)}
            >
              <Plus className="h-5 w-5" />
              Create Market
            </Button>
          </Flex>
        </Flex>

        {/* Markets Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {mockMarkets.map((market) => (
            <MarketCard
              key={market.id}
              market={market}
              onBetYes={handleBetYes}
              onBetNo={handleBetNo}
            />
          ))}
        </div>

        {/* Empty State (if no markets) */}
        {mockMarkets.length === 0 && (
          <Flex
            direction="column"
            align="center"
            justify="center"
            gap="4"
            className="py-20"
          >
            <Text size="5" className="text-slate-600 dark:text-slate-400">
              No markets available yet
            </Text>
            <Button
              size="3"
              className="bg-blue-500 hover:bg-blue-600"
              onClick={() => setCreateModalOpen(true)}
            >
              <Plus className="h-5 w-5" />
              Create the first market
            </Button>
          </Flex>
        )}
      </main>

      {/* Create Market Modal */}
      <CreateMarketModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
    </>
  )
}
