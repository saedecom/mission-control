'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { BrandManager } from './brand-manager'
import { AdVault } from './ad-vault'
import { EvergreenView } from './evergreen-view'
import { BookmarksView } from './bookmarks-view'
import { IntelView } from './intel-view'

export function SpyTabs() {
  return (
    <Tabs defaultValue="brands">
      <TabsList>
        <TabsTrigger value="brands">Brands</TabsTrigger>
        <TabsTrigger value="vault">Vault</TabsTrigger>
        <TabsTrigger value="evergreen">Evergreen</TabsTrigger>
        <TabsTrigger value="intel">Intel</TabsTrigger>
        <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
      </TabsList>
      <TabsContent value="brands">
        <BrandManager />
      </TabsContent>
      <TabsContent value="vault">
        <AdVault />
      </TabsContent>
      <TabsContent value="evergreen">
        <EvergreenView />
      </TabsContent>
      <TabsContent value="intel">
        <IntelView />
      </TabsContent>
      <TabsContent value="bookmarks">
        <BookmarksView />
      </TabsContent>
    </Tabs>
  )
}
