'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, FileVideo, TrendingUp, Bookmark } from 'lucide-react'

interface SpyStatsProps {
  totalBrands: number
  totalAds: number
  evergreenAds: number
  bookmarkedAds: number
}

export function SpyStats({ totalBrands, totalAds, evergreenAds, bookmarkedAds }: SpyStatsProps) {
  const stats = [
    { label: 'Brands', value: totalBrands, icon: Building2, color: 'text-blue-500' },
    { label: 'Total Ads', value: totalAds, icon: FileVideo, color: 'text-green-500' },
    { label: 'Evergreen', value: evergreenAds, icon: TrendingUp, color: 'text-purple-500' },
    { label: 'Bookmarked', value: bookmarkedAds, icon: Bookmark, color: 'text-amber-500' },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
