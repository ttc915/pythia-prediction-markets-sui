'use client'

import { useState } from 'react'
import { Card, Flex, Text, Button, Badge } from '@radix-ui/themes'
import { TrendingUp, TrendingDown, Clock } from 'lucide-react'

export interface MarketCardProps {
  market: {
    id: string
    description: string
    totalYesAmount: number
    totalNoAmount: number
    bettingEndTime: number
    resolved?: boolean
    outcome?: boolean | null
  }
  onBetYes?: (marketId: string) => void
  onBetNo?: (marketId: string) => void
}

const MarketCard = ({ market, onBetYes, onBetNo }: MarketCardProps) => {
  const totalPool = market.totalYesAmount + market.totalNoAmount
  const yesPercentage =
    totalPool > 0 ? (market.totalYesAmount / totalPool) * 100 : 50
  const noPercentage =
    totalPool > 0 ? (market.totalNoAmount / totalPool) * 100 : 50

  // Format pool in SUI (divide by 1B MIST)
  const formattedPool = (totalPool / 1_000_000_000).toFixed(2)

  // Calculate time remaining - using useState to avoid impure function during render
  const [currentTime] = useState(() => Date.now())
  const timeRemaining = market.bettingEndTime - currentTime
  const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24))
  const hoursRemaining = Math.floor(
    (timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  )

  const getTimeRemainingText = () => {
    if (timeRemaining <= 0) return 'Betting closed'
    if (daysRemaining > 0) return `${daysRemaining}d ${hoursRemaining}h left`
    if (hoursRemaining > 0) return `${hoursRemaining}h left`
    return 'Ending soon'
  }

  const handleBetYes = () => {
    if (onBetYes && !market.resolved && timeRemaining > 0) {
      onBetYes(market.id)
    }
  }

  const handleBetNo = () => {
    if (onBetNo && !market.resolved && timeRemaining > 0) {
      onBetNo(market.id)
    }
  }

  return (
    <Card className="dark:hover:border-400 group relative flex h-full overflow-hidden rounded-xl border-2 border-slate-200 bg-white p-0 transition-all hover:border-blue-500 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800">
      <Flex direction="column" gap="4" className="flex-1 p-5">
        {/* Upper content that can grow */}
        <Flex direction="column" gap="4" className="flex-1">
          {/* Header */}
          <Flex direction="column" gap="2">
            <Text
              size="4"
              weight="bold"
              className="line-clamp-2 text-slate-900 dark:text-white"
            >
              {market.description}
            </Text>

            <Flex
              align="center"
              gap="2"
              className="text-slate-600 dark:text-slate-400"
            >
              <Clock className="h-4 w-4" />
              <Text size="2">{getTimeRemainingText()}</Text>
            </Flex>
          </Flex>

          {/* Probability Indicator */}
          <div className="space-y-2">
            <Flex justify="between" align="center">
              <Flex align="center" gap="2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <Text
                  size="2"
                  weight="medium"
                  className="text-slate-700 dark:text-slate-300"
                >
                  YES
                </Text>
              </Flex>
              <Text
                size="3"
                weight="bold"
                className="text-green-600 dark:text-green-400"
              >
                {yesPercentage.toFixed(1)}%
              </Text>
            </Flex>

            {/* Progress Bar */}
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
                style={{ width: `${yesPercentage}%` }}
              />
            </div>

            <Flex justify="between" align="center">
              <Flex align="center" gap="2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <Text
                  size="2"
                  weight="medium"
                  className="text-slate-700 dark:text-slate-300"
                >
                  NO
                </Text>
              </Flex>
              <Text
                size="3"
                weight="bold"
                className="text-red-600 dark:text-red-400"
              >
                {noPercentage.toFixed(1)}%
              </Text>
            </Flex>
          </div>

          {/* Total Pool */}
          <Flex
            justify="between"
            align="center"
            className="border-t border-slate-200 pt-2 dark:border-slate-700"
          >
            <Text size="2" className="text-slate-600 dark:text-slate-400">
              Total Pool
            </Text>
            <Badge color="blue" variant="soft" size="2">
              {formattedPool} SUI
            </Badge>
          </Flex>
        </Flex>

        {/* Buttons section - always at bottom */}
        <div className="space-y-2">
          {/* Bet Buttons */}
          {!market.resolved && timeRemaining > 0 && (
            <Flex gap="3">
              <Button
                size="3"
                className="flex-1 bg-green-500 text-white transition-colors hover:bg-green-600"
                onClick={handleBetYes}
              >
                Bet YES
              </Button>
              <Button
                size="3"
                className="flex-1 bg-red-500 text-white transition-colors hover:bg-red-600"
                onClick={handleBetNo}
              >
                Bet NO
              </Button>
            </Flex>
          )}

          {/* Resolved Badge */}
          {market.resolved && (
            <Badge
              color={market.outcome ? 'green' : 'red'}
              variant="solid"
              size="2"
            >
              Resolved: {market.outcome ? 'YES' : 'NO'}
            </Badge>
          )}

          {/* Betting Closed Badge */}
          {!market.resolved && timeRemaining <= 0 && (
            <Badge color="gray" variant="soft" size="2">
              Betting Closed
            </Badge>
          )}
        </div>
      </Flex>
    </Card>
  )
}

export default MarketCard
