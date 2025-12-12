import { useSuiClientQuery } from '@mysten/dapp-kit'
import { useZKLogin } from '~~/hooks/useZKLogin'
import { CONTRACT_PACKAGE_VARIABLE_NAME } from '~~/config/network'
import { fullStructName } from '~~/helpers/network'
import useNetworkConfig from '~~/hooks/useNetworkConfig'

const useOwnGreeting = () => {
  const { account } = useZKLogin()
  const { useNetworkVariable } = useNetworkConfig()
  const packageId = useNetworkVariable(CONTRACT_PACKAGE_VARIABLE_NAME)

  return useSuiClientQuery('getOwnedObjects', {
    owner: account?.address as string,
    limit: 1,
    filter: {
      StructType: fullStructName(packageId, 'Greeting'),
    },
    options: {
      showContent: true,
      showDisplay: true,
    },
  })
}

export default useOwnGreeting
