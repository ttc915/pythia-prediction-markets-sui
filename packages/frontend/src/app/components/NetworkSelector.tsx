'use client'

import { DropdownMenu, Button } from '@radix-ui/themes'
import { useZKLogin } from '~~/hooks/useZKLogin'
import { ENetwork } from '~~/types/ENetwork'

const NetworkSelector = () => {
    const { network, setNetwork } = useZKLogin()

    const networks = [
        { value: ENetwork.LOCALNET, label: 'Localnet' },
        { value: ENetwork.DEVNET, label: 'Devnet' },
        { value: ENetwork.TESTNET, label: 'Testnet' },
        { value: ENetwork.MAINNET, label: 'Mainnet' },
    ]

    const currentNetwork = networks.find(n => n.value === network) || networks[2]

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                <Button variant="soft" size="2">
                    {currentNetwork.label}
                </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
                {networks.map((net) => (
                    <DropdownMenu.Item
                        key={net.value}
                        onClick={() => setNetwork(net.value)}
                        disabled={net.value === network}
                    >
                        {net.label}
                        {net.value === network && ' ✓'}
                    </DropdownMenu.Item>
                ))}
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    )
}

export default NetworkSelector
