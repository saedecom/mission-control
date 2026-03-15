'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { HookLibrary } from './hook-library'
import { PlaybookGrid } from './playbook-grid'

export function HookVaultTabs() {
  return (
    <Tabs defaultValue="hooks">
      <TabsList>
        <TabsTrigger value="hooks">Hook Library</TabsTrigger>
        <TabsTrigger value="playbook">Visual Playbook</TabsTrigger>
      </TabsList>
      <TabsContent value="hooks">
        <HookLibrary />
      </TabsContent>
      <TabsContent value="playbook">
        <PlaybookGrid />
      </TabsContent>
    </Tabs>
  )
}
