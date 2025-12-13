'use client'

import { useState, useEffect } from 'react'
import { Card, Heading, Flex, Text, TextField, Button } from '@radix-ui/themes'
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react'
import { usePythia } from '~~/context/PythiaContext'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const { isAdmin, approveArbiter, revokeArbiter } = usePythia()
  const [isUserAdmin, setIsUserAdmin] = useState(true)
  const [loading, setLoading] = useState(true)

  const [approveAddr, setApproveAddr] = useState('')
  const [revokeAddr, setRevokeAddr] = useState('')

  const [approving, setApproving] = useState(false)
  const [revoking, setRevoking] = useState(false)

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const adminStatus = await isAdmin()
        setIsUserAdmin(adminStatus)
      } catch (error) {
        console.error('Failed to check admin status:', error)
        setIsUserAdmin(false)
      } finally {
        setLoading(false)
      }
    }
    checkAdmin()
  }, [isAdmin])

  if (loading || !isUserAdmin) {
    return null
  }

  const handleApprove = async () => {
    if (!approveAddr) {
      toast.error('Please enter an address')
      return
    }
    try {
      setApproving(true)
      await approveArbiter({ arbiterAddress: approveAddr })
      toast.success('Arbiter approved successfully')
      setApproveAddr('')
    } catch (error) {
      console.error('Approve failed:', error)
      toast.error('Failed to approve arbiter')
    } finally {
      setApproving(false)
    }
  }

  const handleRevoke = async () => {
    if (!revokeAddr) {
      toast.error('Please enter an address')
      return
    }
    try {
      setRevoking(true)
      await revokeArbiter({ arbiterAddress: revokeAddr })
      toast.success('Arbiter revoked successfully')
      setRevokeAddr('')
    } catch (error) {
      console.error('Revoke failed:', error)
      toast.error('Failed to revoke arbiter')
    } finally {
      setRevoking(false)
    }
  }

  return (
    <Card className="mb-8 border-2 border-purple-200 bg-purple-50 p-6 dark:border-purple-900 dark:bg-purple-900/20">
      <Flex direction="column" gap="4">
        <Flex align="center" gap="2">
          <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          <Heading size="6" className="text-purple-900 dark:text-purple-100">
            Admin Dashboard
          </Heading>
        </Flex>

        <Text size="2" color="gray" className="mb-2">
          Manage protocol arbiters. Only accessible by the protocol admin.
        </Text>

        <Flex gap="6" direction={{ initial: 'column', md: 'row' }}>
          {/* Approve Section */}
          <Flex direction="column" gap="2" className="flex-1">
            <Text weight="bold" size="2" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-600" /> Approve Arbiter
            </Text>
            <Flex gap="2">
              <TextField.Root
                placeholder="0x..."
                value={approveAddr}
                onChange={(e) => setApproveAddr(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleApprove}
                loading={approving}
                disabled={!approveAddr}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                Approve
              </Button>
            </Flex>
          </Flex>

          {/* Revoke Section */}
          <Flex direction="column" gap="2" className="flex-1">
            <Text weight="bold" size="2" className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-600" /> Revoke Arbiter
            </Text>
            <Flex gap="2">
              <TextField.Root
                placeholder="0x..."
                value={revokeAddr}
                onChange={(e) => setRevokeAddr(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleRevoke}
                loading={revoking}
                disabled={!revokeAddr}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Revoke
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  )
}
