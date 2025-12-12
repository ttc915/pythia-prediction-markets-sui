'use client'

import '@mysten/dapp-kit/dist/index.css'
import '@radix-ui/themes/styles.css'
import '@suiware/kit/main.css'
import SuiProvider from '@suiware/kit/SuiProvider'
import { ThemeProvider as NextThemeProvider } from 'next-themes'
import { ReactNode } from 'react'
import { SuiClient } from '@mysten/sui/client'
import { getFullnodeUrl } from '@mysten/sui/client'
import { ZKLoginProvider } from '~~/context/zkLoginContext'
import useNetworkConfig from '~~/hooks/useNetworkConfig'
import { APP_NAME } from '../config/main'
import { getThemeSettings } from '../helpers/theme'
import { ENetwork } from '../types/ENetwork'
import ThemeProvider from './ThemeProvider'

const themeSettings = getThemeSettings()

export default function ClientProviders({ children }: { children: ReactNode }) {
  const { networkConfig } = useNetworkConfig()

  // Create Sui client for current network (defaulting to localnet)
  const suiClient = new SuiClient({
    url: getFullnodeUrl(ENetwork.LOCALNET)
  })

  return (
    <NextThemeProvider attribute="class">
      <ThemeProvider>
        <SuiProvider
          customNetworkConfig={networkConfig}
          defaultNetwork={ENetwork.LOCALNET}
          walletAutoConnect={false}
          walletStashedName={APP_NAME}
          themeSettings={themeSettings}
        >
          <ZKLoginProvider suiClient={suiClient}>
            {children}
          </ZKLoginProvider>
        </SuiProvider>
      </ThemeProvider>
    </NextThemeProvider>
  )
}
