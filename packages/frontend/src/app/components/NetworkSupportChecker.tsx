'use client'

import { useZKLogin } from '~~/hooks/useZKLogin'
import { isNetworkSupported, supportedNetworks } from '../helpers/network'

const NetworkSupportChecker = () => {
  const { account, network } = useZKLogin()

  const okNetworks = supportedNetworks()

  if (account == null || okNetworks.length === 0) {
    return <></>
  }

  // Check if zkLogin network is supported
  if (network == null || isNetworkSupported(network as any)) {
    return <></>
  }

  return (
    <div className="mx-auto w-full max-w-lg px-3 py-2">
      <div className="w-full rounded border border-red-400 px-3 py-2 text-center text-red-400">
        The <span className="font-bold">{network}</span> network is not currently
        supported by the app.
        <br />
        Please switch to a supported network [
        <span className="font-bold">{okNetworks.join(', ')}</span>] using the
        network selector in the header.
      </div>
    </div>
  )
}

export default NetworkSupportChecker
