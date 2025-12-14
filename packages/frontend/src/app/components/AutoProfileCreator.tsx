import { useAutoCreateProfile } from '~~/hooks/useAutoCreateProfile'
import { ProfileCreationDialog } from './ProfileCreationDialog'

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
    <ProfileCreationDialog
      open={true}
      onDismiss={dismissProfileCreation}
      onCreate={createProfile}
      isCreating={isCreating}
      error={error}
    />
  )
}
