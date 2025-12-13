
import { SuiClient } from '@mysten/sui/client';

const FULLNODE_URL = 'https://fullnode.testnet.sui.io:443';
const PACKAGE_ID = process.env.NEXT_PUBLIC_TESTNET_CONTRACT_PACKAGE_ID;

if (!PACKAGE_ID) {
    console.error('PACKAGE_ID not found in env');
    process.exit(1);
}

const MODULE_NAME = 'pythia';
const MARKET_TYPE = `${PACKAGE_ID}::${MODULE_NAME}::Market`;

const client = new SuiClient({ url: FULLNODE_URL });

async function main() {
    console.log(`Checking for Market objects of type: ${MARKET_TYPE}`);

    // 1. Try getOwnedObjects without owner (EXPECT FAIL or Invalid)
    try {
        console.log('--- Attempting getOwnedObjects (no owner) ---');
        // @ts-ignore
        await client.getOwnedObjects({
            filter: { StructType: MARKET_TYPE }
        });
    } catch (e: any) {
        console.log('getOwnedObjects failed as expected:', e.message);
    }

    // 2. Try getOwnedObjects with null owner?
    try {
        console.log('--- Attempting getOwnedObjects (owner=0x0) ---');
        await client.getOwnedObjects({
            owner: '0x0000000000000000000000000000000000000000000000000000000000000000',
            filter: { StructType: MARKET_TYPE }
        });
        console.log('getOwnedObjects(0x0) returned (unexpected)');
    } catch (e: any) {
        console.log('getOwnedObjects(0x0) failed:', e.message);
    }

    // 3. Try queryTransactionBlocks? (Alternative if object query fails)
    // This is just to see if we can find creation txs easily without events query
    // But user said "query blockchain" usually implies objects.

    // 4. Try extended getObjects / queryObjects if available
    // Inspect client to see if it has 'queryObjects' or similar generic search
    // Using direct RPC call if needed
    try {
        console.log('--- Attempting suix_queryObjects via generic request ---');
        // Using call method from client which is standard in some SDKs or accessing private provider
        // The typescript SDK has 'call' usually exposed or we use client.transport.request?
        // Let's rely on standard client methods first

        // Check if client has queryObjects
        if ('queryObjects' in client) {
            console.log('client.queryObjects exists!');
            // @ts-ignore
            const result = await client.queryObjects({
                query: {
                    filter: { StructType: MARKET_TYPE }
                },
                options: { showContent: true }
            });
            console.log('queryObjects result count:', result.data.length);
            if (result.data.length > 0) {
                console.log('First object:', JSON.stringify(result.data[0], null, 2));
            }
        } else {
            console.log('client.queryObjects DOES NOT exist on this SDK version');
        }

    } catch (e: any) {
        console.log('queryObjects failed:', e.message);
    }
}

main().catch(console.error);
