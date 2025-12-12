'use client'

import { useState } from 'react'
import { Button, DropdownMenu } from '@radix-ui/themes'
import { useUnifiedWallet } from '~~/context/UnifiedWalletContext'
import ConnectModal from './ConnectModal'

const CustomConnectButton = () => {
  const { account, accountType, disconnect, loginWithGoogle, isLoading } =
    useUnifiedWallet()
  const [modalOpen, setModalOpen] = useState(false)

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
        <DropdownMenu.Content>
          {account.email && (
            <DropdownMenu.Item disabled>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {account.email}
              </div>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item>
            <div className="flex flex-col gap-1">
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {accountType === 'zklogin'
                  ? 'zkLogin Address'
                  : 'Wallet Address'}
              </div>
              <div className="font-mono text-xs">{account.address}</div>
            </div>
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item color="red" onClick={disconnect}>
            Disconnect
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
