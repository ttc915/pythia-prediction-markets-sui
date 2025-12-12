import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'

/**
 * Deterministic salt generation using HKDF
 * Based on zkLogin documentation option 4:
 * https://docs.sui.io/guides/developer/cryptography/zklogin-integration#user-salt-management
 * 
 * HKDF(ikm = master_seed, salt = iss || aud, info = sub)
 * This generates a consistent salt for each user based on their JWT claims
 */
function generateUserSalt(decodedJwt: any): string {
    // Master seed - store this securely! Changing it will result in different addresses
    const masterSeed = process.env.ZKLOGIN_MASTER_SEED || 'default-dev-seed-change-in-production'

    // Extract claims from JWT
    const iss = decodedJwt.iss // Issuer (e.g., "https://accounts.google.com")
    const aud = Array.isArray(decodedJwt.aud) ? decodedJwt.aud[0] : decodedJwt.aud // Audience (OAuth client ID)
    const sub = decodedJwt.sub // Subject (unique user identifier)

    // HKDF implementation
    // salt = iss || aud
    const salt = `${iss}${aud}`

    // info = sub
    const info = sub

    // HKDF using HMAC-SHA256
    const hmac = createHmac('sha256', masterSeed)
    hmac.update(salt)
    const prk = hmac.digest()

    const hmac2 = createHmac('sha256', prk)
    hmac2.update(Buffer.concat([Buffer.from(info), Buffer.from([0x01])]))
    const okm = hmac2.digest()

    // Convert to BigInt and ensure it's less than 2^128
    const saltBigInt = BigInt('0x' + okm.toString('hex').slice(0, 32))
    return saltBigInt.toString()
}

export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json()

        if (!token) {
            return NextResponse.json(
                { error: 'JWT token is required' },
                { status: 400 }
            )
        }

        // Decode JWT to extract claims
        const parts = token.split('.')
        if (parts.length !== 3) {
            return NextResponse.json(
                { error: 'Invalid JWT format' },
                { status: 400 }
            )
        }

        const payload = parts[1]
        const decodedJwt = JSON.parse(
            Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
        )

        // Generate deterministic salt using HKDF
        const salt = generateUserSalt(decodedJwt)

        return NextResponse.json({ salt })
    } catch (error) {
        console.error('Salt generation error:', error)
        return NextResponse.json(
            { error: 'Failed to generate salt' },
            { status: 500 }
        )
    }
}
