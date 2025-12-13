'use client'

import { useState } from 'react'
import { Button, DropdownMenu } from '@radix-ui/themes'
import { Copy, Check } from 'lucide-react'
import { useUnifiedWallet } from '~~/context/UnifiedWalletContext'
import ConnectModal from './ConnectModal'
import UnifiedBalance from './UnifiedBalance'

const CustomConnectButton = () => {
  const { account, accountType, disconnect, loginWithGoogle, isLoading } =
    useUnifiedWallet()
  const [modalOpen, setModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    if (account?.address) {
      await navigator.clipboard.writeText(account.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (account) {
    // Show connected account with dropdown menu
    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="solid" size="4">
            <span className="inline-block max-w-[120px] truncate">
              {account.address.slice(0, 6)}...{account.address.slice(-4)}
            </span>
          </Button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content style={{ minWidth: '360px' }}>
          {account.email && (
            <DropdownMenu.Item disabled className="cursor-default opacity-100">
              <span className="text-xs font-medium text-slate-500">Email</span>
              <span className="text-sm text-slate-900 dark:text-slate-100">
                {account.email}
              </span>
            </DropdownMenu.Item>
          )}

          <DropdownMenu.Item
            disabled
            className="mt-4 cursor-default opacity-100"
          >
            <div className="flex w-full flex-col gap-1 py-1">
              <span className="text-xs font-medium text-slate-500">
                {accountType === 'zklogin'
                  ? 'zkLogin Address'
                  : 'Wallet Address'}
              </span>
              <div className="flex items-center justify-between gap-2 rounded-md bg-slate-100 p-2 dark:bg-slate-800">
                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                  {account.address.slice(0, 10)}...{account.address.slice(-10)}
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    copyToClipboard()
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded hover:bg-white hover:shadow-sm dark:hover:bg-slate-700"
                  title="Copy address"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3 text-slate-500" />
                  )}
                </button>
              </div>
            </div>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            disabled
            className="mt-9 cursor-default opacity-100"
          >
            <div className="flex w-full flex-col gap-1 py-1">
              <span className="text-xs font-medium text-slate-500">
                Balance
              </span>
              <UnifiedBalance />
            </div>
          </DropdownMenu.Item>

          <DropdownMenu.Separator />
          <DropdownMenu.Item
            color="red"
            onClick={disconnect}
            className="cursor-pointer"
          >
            <div className="w-full text-center font-medium">Disconnect</div>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    )
  }

  // Show connect button with modal
  return (
    <>
      <Button
        variant="solid"
        size="4"
        onClick={() => setModalOpen(true)}
        disabled={isLoading}
      >
        {isLoading ? 'Connecting...' : 'Connect'}
      </Button>

      <ConnectModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onZKLoginClick={loginWithGoogle}
      />
    </>
  )
}

export default CustomConnectButton
