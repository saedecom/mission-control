'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { SpyAd } from '@/lib/spy-types'
import { SpyAdCard } from './spy-ad-card'
import { AdDetailDialog } from './ad-detail-dialog'

export function EvergreenView() {
  const [ads, setAds] = useState<SpyAd[]>([])
  const [selectedAd, setSelectedAd] = useState<SpyAd | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('spy_ads')
      .select('*, spy_brands(brand_name)')
      .gte('weeks_in_top10', 4)
      .order('weeks_in_top10', { ascending: false })

    const adsWithBrand = (data || []).map((ad) => ({
      ...ad,
      brand_name: (ad.spy_brands as { brand_name: string } | null)?.brand_name || undefined,
    }))

    setAds(adsWithBrand)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-4 mt-4">
      <div>
        <h2 className="text-lg font-semibold">Evergreen Winners</h2>
        <p className="text-sm text-muted-foreground">
          Ads that have stayed in the top 10 for 4+ weeks — proven performers.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-video rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : ads.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No evergreen ads yet. Keep scraping weekly to track longevity.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ads.map((ad) => (
            <SpyAdCard
              key={ad.id}
              ad={ad}
              onClick={() => setSelectedAd(ad)}
              onBookmarkToggle={fetchData}
            />
          ))}
        </div>
      )}

      <AdDetailDialog
        ad={selectedAd}
        open={!!selectedAd}
        onOpenChange={(open) => !open && setSelectedAd(null)}
        onAnalyzed={fetchData}
      />
    </div>
  )
}
