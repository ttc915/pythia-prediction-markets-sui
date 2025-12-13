import { Button, Dialog, Flex, IconButton, Text } from '@radix-ui/themes'
import { UserPlus, X } from 'lucide-react'
import { useAutoCreateProfile } from '~~/hooks/useAutoCreateProfile'

/**
 * Component that monitors profile status and prompts user to create one if missing.
 * Must be rendered within the provider tree.
 */
export function AutoProfileCreator() {
  const {
    needsProfile,
    createProfile,
    isCreating,
    error,
    dismissProfileCreation,
  } = useAutoCreateProfile()

  if (!needsProfile) return null

  return (
    <Dialog.Root open={true}>
      <Dialog.Content style={{ maxWidth: 450 }}>
        <Flex justify="between" align="center" mb="4">
          <Dialog.Title style={{ margin: 0 }}>Welcome to Pythia</Dialog.Title>
          <IconButton
            variant="ghost"
            color="gray"
            onClick={dismissProfileCreation}
          >
            <X size={20} />
          </IconButton>
        </Flex>

        <Dialog.Description size="2" mb="4">
          To start betting on prediction markets, you need to initialize your
          account on the blockchain. This is a one-time setup.
        </Dialog.Description>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error.message}
          </div>
        )}

        <Flex gap="3" justify="end">
          <Button variant="soft" color="gray" onClick={dismissProfileCreation}>
            Skip for now
          </Button>
          <Button
            onClick={createProfile}
            loading={isCreating}
            size="3"
            variant="solid"
          >
            <UserPlus size={18} />
            Initialize Account
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
