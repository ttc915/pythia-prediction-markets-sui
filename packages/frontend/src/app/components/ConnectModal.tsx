'use client'

import { Dialog, Button, Flex, Text } from '@radix-ui/themes'
import { Wallet, Chrome } from 'lucide-react'
import { ConnectButton } from '@mysten/dapp-kit'

interface ConnectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onZKLoginClick: () => void
}

const ConnectModal = ({
  open,
  onOpenChange,
  onZKLoginClick,
}: ConnectModalProps) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="450px">
        <Dialog.Title className="text-center text-2xl font-bold">
          Connect Your Wallet
        </Dialog.Title>

        <Dialog.Description className="mb-6 text-center text-slate-600 dark:text-slate-400">
          Choose how you&apos;d like to connect
        </Dialog.Description>

        <Flex direction="column" gap="4">
          {/* zkLogin Option */}
          <button
            onClick={() => {
              onZKLoginClick()
              onOpenChange(false)
            }}
            className="group relative overflow-hidden rounded-xl border-2 border-slate-200 bg-white p-6 transition-all hover:border-blue-500 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-400"
          >
            <Flex align="center" gap="4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 transition-colors group-hover:bg-blue-500 dark:bg-blue-900 dark:group-hover:bg-blue-600">
                <Chrome className="h-6 w-6 text-blue-600 transition-colors group-hover:text-white dark:text-blue-400 dark:group-hover:text-white" />
              </div>
              <Flex direction="column" align="start" gap="1">
                <Text
                  size="5"
                  weight="bold"
                  className="text-slate-900 dark:text-white"
                >
                  Login with Google
                </Text>
                <Text size="2" className="text-slate-600 dark:text-slate-400">
                  Use zkLogin for seamless authentication
                </Text>
              </Flex>
            </Flex>
          </button>

          {/* Divider */}
          <Flex align="center" gap="3" className="my-2">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            <Text size="2" className="text-slate-500 dark:text-slate-500">
              OR
            </Text>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </Flex>

          {/* Wallet Connection Option */}
          <div className="group relative overflow-hidden rounded-xl border-2 border-slate-200 bg-white p-6 transition-all hover:border-purple-500 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:hover:border-purple-400">
            <Flex direction="column" gap="3">
              <Flex align="center" gap="4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 transition-colors group-hover:bg-purple-500 dark:bg-purple-900 dark:group-hover:bg-purple-600">
                  <Wallet className="h-6 w-6 text-purple-600 transition-colors group-hover:text-white dark:text-purple-400 dark:group-hover:text-white" />
                </div>
                <Flex direction="column" align="start" gap="1">
                  <Text
                    size="5"
                    weight="bold"
                    className="text-slate-900 dark:text-white"
                  >
                    Connect Wallet
                  </Text>
                  <Text size="2" className="text-slate-600 dark:text-slate-400">
                    Slush, Phantom, Sui Wallet, and more
                  </Text>
                </Flex>
              </Flex>

              {/* Wallet Connect Button */}
              <div className="mt-2">
                <ConnectButton
                  connectText="Select Wallet"
                  className="w-full"
                  style={{ width: '100%' }}
                />
              </div>
            </Flex>
          </div>
        </Flex>

        <Dialog.Close>
          <Button variant="soft" color="gray" className="mt-6 w-full" size="3">
            Cancel
          </Button>
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Root>
  )
}

export default ConnectModal
