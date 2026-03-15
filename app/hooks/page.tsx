'use client'

import { HookVaultTabs } from '@/components/hooks/hook-vault-tabs'

export default function HooksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Hook Vault</h1>
        <p className="text-muted-foreground">543 proven ad hooks + 36 visual playbook formats from AdHookVault</p>
      </div>
      <HookVaultTabs />
    </div>
  )
}
