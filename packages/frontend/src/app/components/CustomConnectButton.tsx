'use client'

import { Button, DropdownMenu } from '@radix-ui/themes'
import { useZKLogin } from '~~/hooks/useZKLogin'

const CustomConnectButton = () => {
  const { account, login, logout, isLoading } = useZKLogin()

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
              <div className="text-xs text-slate-600 dark:text-slate-400">Address</div>
              <div className="font-mono text-xs">{account.address}</div>
            </div>
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item color="red" onClick={logout}>
            Logout
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    )
  }

  // Show login button
  return (
    <Button
      variant="solid"
      size="4"
      onClick={login}
      disabled={isLoading}
    >
      {isLoading ? 'Connecting...' : 'Login with Google'}
    </Button>
  )
}

export default CustomConnectButton
