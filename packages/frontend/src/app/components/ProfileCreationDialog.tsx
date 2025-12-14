import { Button, Dialog, Flex, IconButton } from '@radix-ui/themes'
import { UserPlus, X } from 'lucide-react'

interface ProfileCreationDialogProps {
  open: boolean
  onDismiss: () => void
  onCreate: () => void
  isCreating: boolean
  error: Error | null
}

export function ProfileCreationDialog({
  open,
  onDismiss,
  onCreate,
  isCreating,
  error,
}: ProfileCreationDialogProps) {
  return (
    <Dialog.Root open={open}>
      <Dialog.Content style={{ maxWidth: 450 }}>
        <Flex justify="between" align="center" mb="4">
          <Dialog.Title style={{ margin: 0 }}>Welcome to Pythia</Dialog.Title>
          <IconButton variant="ghost" color="gray" onClick={onDismiss}>
            <X size={20} />
          </IconButton>
        </Flex>

        <Dialog.Description size="2" mb="4">
          To start betting on prediction markets, you need to initialize your
          account on the blockchain. This is a one-time setup (requires a small
          amount of SUI for gas).
        </Dialog.Description>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error.message}
          </div>
        )}

        <Flex gap="3" justify="end">
          <Button variant="soft" color="gray" onClick={onDismiss}>
            Skip for now
          </Button>
          <Button
            onClick={onCreate}
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
