'use client'

import { useState } from 'react'
import { Dialog, Button, Flex, Text, TextArea } from '@radix-ui/themes'
import { Plus, Wallet } from 'lucide-react'
import { usePythia } from '~~/hooks/usePythia'
import { useUnifiedWallet } from '~~/context/UnifiedWalletContext'
import ConnectModal from './ConnectModal'

interface CreateMarketModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CreateMarketModal = ({ open, onOpenChange }: CreateMarketModalProps) => {
  const { createMarket, isLoading, error } = usePythia()
  const { account, loginWithGoogle } = useUnifiedWallet()

  const [description, setDescription] = useState('')
  const [bettingEndDate, setBettingEndDate] = useState('')
  const [resolutionDate, setResolutionDate] = useState('')
  const [arbiters, setArbiters] = useState('')
  const [threshold, setThreshold] = useState('1')
  const [success, setSuccess] = useState(false)
  const [marketId, setMarketId] = useState<string | null>(null)
  const [connectModalOpen, setConnectModalOpen] = useState(false)

  // Get minimum datetime for inputs (now)
  const [minDateTime] = useState(() => {
    const now = new Date()
    return now.toISOString().slice(0, 16)
  })

  const resetForm = () => {
    setDescription('')
    setBettingEndDate('')
    setResolutionDate('')
    setArbiters('')
    setThreshold('1')
    setSuccess(false)
    setMarketId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Parse arbiters (comma-separated addresses)
      const arbiterList = arbiters
        .split(',')
        .map((addr) => addr.trim())
        .filter((addr) => addr.length > 0)

      if (arbiterList.length === 0) {
        alert('Please add at least one arbiter address')
        return
      }

      // Convert dates to timestamps
      const bettingEndTime = new Date(bettingEndDate).getTime()
      const resolutionDeadline = new Date(resolutionDate).getTime()

      const result = await createMarket({
        description,
        bettingEndTime,
        resolutionDeadline,
        arbiters: arbiterList,
        arbiterThreshold: parseInt(threshold),
      })

      setSuccess(true)
      setMarketId(result.marketId)

      // Reset form after 3 seconds and close modal
      setTimeout(() => {
        resetForm()
        onOpenChange(false)
      }, 3000)
    } catch (err) {
      console.error('Failed to create market:', err)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      resetForm()
      onOpenChange(false)
    }
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={handleClose}>
        <Dialog.Content maxWidth="600px">
          <Dialog.Title className="text-center text-2xl font-bold">
            Create Prediction Market
          </Dialog.Title>

          <Dialog.Description className="mb-6 text-center text-slate-600 dark:text-slate-400">
            Set up a new market for users to bet on
          </Dialog.Description>

          {success ? (
            <Flex direction="column" gap="4" align="center" className="py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <Plus className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <Text
                size="5"
                weight="bold"
                className="text-green-600 dark:text-green-400"
              >
                Market Created Successfully!
              </Text>
              {marketId && (
                <Text size="2" className="text-slate-600 dark:text-slate-400">
                  Market ID: {marketId.slice(0, 8)}...{marketId.slice(-6)}
                </Text>
              )}
              <Text size="2" className="text-slate-500 dark:text-slate-500">
                Closing automatically...
              </Text>
            </Flex>
          ) : !account ? (
            <Flex direction="column" gap="4" align="center" className="py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <Wallet className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <Text
                size="5"
                weight="bold"
                className="text-slate-900 dark:text-white"
              >
                Connect Your Wallet
              </Text>
              <Text
                size="3"
                className="text-center text-slate-600 dark:text-slate-400"
              >
                To create a prediction market, you need to connect your wallet
                first.
              </Text>
              <Button
                size="3"
                className="mt-2 bg-blue-500 hover:bg-blue-600"
                onClick={() => setConnectModalOpen(true)}
              >
                Connect Wallet
              </Button>
            </Flex>
          ) : (
            <form onSubmit={handleSubmit}>
              <Flex direction="column" gap="4">
                {/* Market Question */}
                <div>
                  <label
                    htmlFor="description"
                    className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Market Question <span className="text-red-500">*</span>
                  </label>
                  <TextArea
                    id="description"
                    placeholder="Will it rain tomorrow in San Francisco?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    maxLength={200}
                    className="w-full"
                    rows={3}
                  />
                  <Text size="1" className="mt-1 text-slate-500">
                    {description.length}/200 characters
                  </Text>
                </div>

                {/* Betting End Time */}
                <div>
                  <label
                    htmlFor="bettingEnd"
                    className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Betting Ends <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    id="bettingEnd"
                    value={bettingEndDate}
                    onChange={(e) => setBettingEndDate(e.target.value)}
                    min={minDateTime}
                    required
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                  <Text size="1" className="mt-1 text-slate-500">
                    When betting closes for this market
                  </Text>
                </div>

                {/* Resolution Deadline */}
                <div>
                  <label
                    htmlFor="resolution"
                    className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Resolution Deadline <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    id="resolution"
                    value={resolutionDate}
                    onChange={(e) => setResolutionDate(e.target.value)}
                    min={bettingEndDate || minDateTime}
                    required
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                  <Text size="1" className="mt-1 text-slate-500">
                    Final deadline for arbiter resolution
                  </Text>
                </div>

                {/* Arbiters */}
                <div>
                  <label
                    htmlFor="arbiters"
                    className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Arbiters <span className="text-red-500">*</span>
                  </label>
                  <TextArea
                    id="arbiters"
                    placeholder="0x1234..., 0x5678..."
                    value={arbiters}
                    onChange={(e) => setArbiters(e.target.value)}
                    required
                    className="w-full font-mono text-sm"
                    rows={2}
                  />
                  <Text size="1" className="mt-1 text-slate-500">
                    Comma-separated addresses of approved arbiters
                  </Text>
                </div>

                {/* Arbiter Threshold */}
                <div>
                  <label
                    htmlFor="threshold"
                    className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Arbiter Threshold <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="threshold"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    min="1"
                    required
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                  <Text size="1" className="mt-1 text-slate-500">
                    Minimum votes needed for consensus
                  </Text>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="rounded-md bg-red-50 p-3 dark:bg-red-900/20">
                    <Text size="2" className="text-red-600 dark:text-red-400">
                      {error.message}
                    </Text>
                  </div>
                )}

                {/* Submit Button */}
                <Flex gap="3" className="mt-2">
                  <Button
                    type="submit"
                    size="3"
                    className="flex-1 bg-blue-500 hover:bg-blue-600"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating...' : 'Create Market'}
                  </Button>
                  <Button
                    type="button"
                    size="3"
                    variant="soft"
                    color="gray"
                    onClick={handleClose}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </Flex>
              </Flex>
            </form>
          )}
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

export default CreateMarketModal
