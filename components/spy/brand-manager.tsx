'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { SpyBrand, SpyAd } from '@/lib/spy-types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BrandDialog } from './brand-dialog'
import { ScrapeProgress } from './scrape-progress'
import { SpyStats } from './spy-stats'
import { Trash2, RefreshCw, ExternalLink } from 'lucide-react'

interface ScrapeJob {
  brandId: string
  runId: string
}

export function BrandManager() {
  const [brands, setBrands] = useState<SpyBrand[]>([])
  const [ads, setAds] = useState<SpyAd[]>([])
  const [loading, setLoading] = useState(true)
  const [scrapeJobs, setScrapeJobs] = useState<Map<string, ScrapeJob>>(new Map())

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [brandsRes, adsRes] = await Promise.all([
      supabase.from('spy_brands').select('*').order('created_at', { ascending: false }),
      supabase.from('spy_ads').select('*'),
    ])
    setBrands(brandsRes.data || [])
    setAds(adsRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleScrape = async (brandId: string) => {
    try {
      const res = await fetch('/api/spy/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_id: brandId }),
      })
      const data = await res.json()
      if (data.run_id) {
        setScrapeJobs((prev) => new Map(prev).set(brandId, { brandId, runId: data.run_id }))
      }
    } catch (err) {
      console.error('Failed to start scrape:', err)
    }
  }

  const handleDelete = async (brandId: string) => {
    await supabase.from('spy_weekly_snapshots').delete().eq('brand_id', brandId)
    await supabase.from('spy_ads').delete().eq('brand_id', brandId)
    await supabase.from('spy_brands').delete().eq('id', brandId)
    fetchData()
  }

  const evergreenCount = ads.filter((a) => a.weeks_in_top10 >= 4).length
  const bookmarkedCount = ads.filter((a) => a.bookmarked).length

  return (
    <div className="space-y-6 mt-4">
      <SpyStats
        totalBrands={brands.length}
        totalAds={ads.length}
        evergreenAds={evergreenCount}
        bookmarkedAds={bookmarkedCount}
      />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Monitored Brands</h2>
        <BrandDialog onBrandAdded={fetchData} />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : brands.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No brands added yet. Click &quot;Add Brand&quot; to start monitoring.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {brands.map((brand) => {
            const brandAds = ads.filter((a) => a.brand_id === brand.id)
            const scrapeJob = scrapeJobs.get(brand.id)

            return (
              <Card key={brand.id}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base">{brand.brand_name}</CardTitle>
                      {brand.vertical && (
                        <Badge variant="secondary">{brand.vertical}</Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {brandAds.length} ads
                      </span>
                      {brand.last_scraped && (
                        <span className="text-xs text-muted-foreground">
                          Last scraped: {new Date(brand.last_scraped).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {scrapeJob ? (
                        <ScrapeProgress
                          runId={scrapeJob.runId}
                          brandId={brand.id}
                          onComplete={() => {
                            setScrapeJobs((prev) => {
                              const next = new Map(prev)
                              next.delete(brand.id)
                              return next
                            })
                            fetchData()
                          }}
                          onError={() => {
                            setScrapeJobs((prev) => {
                              const next = new Map(prev)
                              next.delete(brand.id)
                              return next
                            })
                          }}
                        />
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleScrape(brand.id)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Scrape
                        </Button>
                      )}
                      <a
                        href={brand.ad_library_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(brand.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
