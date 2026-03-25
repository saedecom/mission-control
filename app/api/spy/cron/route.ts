import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { getWeekStart, getMediaFingerprint } from '@/lib/spy-utils'

const APIFY_TOKEN = process.env.APIFY_TOKEN!
const ACTOR_ID = 'JJghSZmShuco4j9gJ'
const CRON_SECRET = process.env.CRON_SECRET

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const STORAGE_BUCKET = 'ad-creatives'

interface ApifyAdResult {
  adArchiveID?: string
  adArchiveId?: string
  adid?: string
  snapshot?: {
    title?: string
    body?: { text?: string } | { markup?: { __html?: string } }
    cards?: Array<{
      title?: string
      body?: string
      link_url?: string
      linkUrl?: string
      originalImageUrl?: string
      resizedImageUrl?: string
      videoHdUrl?: string
      videoSdUrl?: string
      videoPreviewImageUrl?: string
    }>
    cta_text?: string
    cta_type?: string
    ctaText?: string
    ctaType?: string
    videos?: Array<{ video_hd_url?: string; video_sd_url?: string; video_preview_image_url?: string }>
    images?: Array<{ original_image_url?: string; resized_image_url?: string }>
    link_url?: string
  }
  startDate?: string
  isActive?: boolean
  publisherPlatform?: string[]
  collationCount?: number
  pageName?: string
}

async function uploadToStorage(sourceUrl: string, adId: string): Promise<string | null> {
  try {
    const imgRes = await fetch(sourceUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
    })
    if (!imgRes.ok) return null
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
    const filePath = `${adId}.${ext}`
    const body = await imgRes.arrayBuffer()
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${filePath}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': contentType,
          'x-upsert': 'true',
        },
        body: Buffer.from(body),
      }
    )
    if (!uploadRes.ok) return null
    return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${filePath}`
  } catch {
    return null
  }
}

function extractAdData(item: ApifyAdResult, rank: number, brandId: string) {
  const adId = item.adArchiveID || item.adArchiveId || item.adid || `unknown-${Date.now()}`
  const snapshot = item.snapshot || {}
  const firstCard = snapshot.cards?.[0]
  const videos = snapshot.videos || []
  const images = snapshot.images || []

  let adCopy = ''
  if (snapshot.body) {
    const body = snapshot.body as Record<string, unknown>
    adCopy = (body.text as string) || ''
    if (!adCopy && body.markup) {
      const markup = body.markup as Record<string, string>
      adCopy = (markup.__html || '').replace(/<[^>]*>/g, '')
    }
  }

  const headline = firstCard?.title || snapshot.title || ''

  const cardVideoUrl = firstCard?.videoHdUrl || firstCard?.videoSdUrl || null
  const cardImageUrl = firstCard?.originalImageUrl || firstCard?.resizedImageUrl || null
  const cardVideoPreview = firstCard?.videoPreviewImageUrl || null

  const snapshotVideoUrl = videos[0]?.video_hd_url || videos[0]?.video_sd_url || null
  const snapshotImageUrl = images[0]?.original_image_url || images[0]?.resized_image_url || null
  const snapshotVideoPreview = videos[0]?.video_preview_image_url || null

  const videoUrl = cardVideoUrl || snapshotVideoUrl || null
  const imageUrl = cardImageUrl || snapshotImageUrl || null
  const thumbnailUrl = cardVideoPreview || snapshotVideoPreview || imageUrl || null

  const creativeType = videoUrl ? 'video' : 'image'
  const ctaType = snapshot.cta_text || snapshot.ctaText || snapshot.cta_type || snapshot.ctaType || null
  const adLibraryLink = `https://www.facebook.com/ads/library/?id=${adId}`

  return {
    ad_id: adId,
    brand_id: brandId,
    rank,
    creative_type: creativeType,
    creative_url: thumbnailUrl,
    video_url: videoUrl,
    ad_copy: adCopy || null,
    headline: headline || null,
    cta_type: ctaType,
    start_date: item.startDate || null,
    ad_library_link: adLibraryLink,
    first_seen: new Date().toISOString(),
    last_seen: new Date().toISOString(),
    weeks_in_top10: 1,
    bookmarked: false,
    _source_image_url: thumbnailUrl,
  }
}

async function pollApifyRun(runId: string, maxWaitMs = 300000): Promise<{ status: string; datasetId?: string }> {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`)
    const data = await res.json()
    const status = data.data?.status

    if (status === 'SUCCEEDED') {
      return { status: 'SUCCEEDED', datasetId: data.data.defaultDatasetId }
    }
    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      return { status }
    }

    // Wait 10 seconds between polls
    await new Promise((resolve) => setTimeout(resolve, 10000))
  }
  return { status: 'TIMEOUT' }
}

async function processApifyResults(datasetId: string, brandId: string) {
  const resultsRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
  )
  const apifyResults: ApifyAdResult[] = await resultsRes.json()

  if (!apifyResults || apifyResults.length === 0) {
    return { ads_processed: 0, total_raw: 0 }
  }

  // === 3-PASS DEDUP ===

  // Pass 1: Dedup by adArchiveID
  const seenIds = new Set<string>()
  const uniqueById = apifyResults.filter((item) => {
    const adId = item.adArchiveID || item.adArchiveId || item.adid
    if (!adId) return true
    if (seenIds.has(adId)) return false
    seenIds.add(adId)
    return true
  })

  // Pass 2: Dedup by media fingerprint (keep oldest)
  const mediaGrouped = new Map<string, { item: ApifyAdResult; startTimestamp: number }>()
  const noMediaItems: ApifyAdResult[] = []
  for (const item of uniqueById) {
    const snapshot = item.snapshot || {}
    const videos = snapshot.videos || []
    const images = snapshot.images || []
    const firstCard = snapshot.cards?.[0]
    const mediaUrl = firstCard?.videoHdUrl || firstCard?.videoSdUrl || firstCard?.originalImageUrl ||
      videos[0]?.video_hd_url || videos[0]?.video_sd_url || images[0]?.original_image_url || null
    const fingerprint = getMediaFingerprint(mediaUrl)
    const startTimestamp = item.startDate ? new Date(item.startDate).getTime() : Date.now()

    if (fingerprint) {
      const key = `media:${fingerprint}`
      const existing = mediaGrouped.get(key)
      if (!existing || startTimestamp < existing.startTimestamp) {
        mediaGrouped.set(key, { item, startTimestamp })
      }
    } else {
      noMediaItems.push(item)
    }
  }
  const afterMediaDedup = [...Array.from(mediaGrouped.values()).map((v) => v.item), ...noMediaItems]

  // Pass 3: Dedup by headline (keep oldest)
  const headlineGrouped = new Map<string, { item: ApifyAdResult; startTimestamp: number }>()
  const noHeadlineItems: ApifyAdResult[] = []
  for (const item of afterMediaDedup) {
    const snapshot = item.snapshot || {}
    const firstCard = snapshot.cards?.[0]
    const headline = (firstCard?.title || snapshot.title || '').trim().toLowerCase()
    const startTimestamp = item.startDate ? new Date(item.startDate).getTime() : Date.now()

    if (headline) {
      const key = `headline:${headline}`
      const existing = headlineGrouped.get(key)
      if (!existing || startTimestamp < existing.startTimestamp) {
        headlineGrouped.set(key, { item, startTimestamp })
      }
    } else {
      noHeadlineItems.push(item)
    }
  }
  const finalAds = [...Array.from(headlineGrouped.values()).map((v) => v.item), ...noHeadlineItems]

  // === PROCESS & STORE ===
  const db = getSupabaseServer()
  const weekStart = getWeekStart()
  let adsProcessed = 0

  for (let i = 0; i < finalAds.length; i++) {
    const adData = extractAdData(finalAds[i], i + 1, brandId)

    // Upload image to Supabase Storage
    const sourceImageUrl = (adData as Record<string, unknown>)._source_image_url as string | null
    if (sourceImageUrl) {
      const storageUrl = await uploadToStorage(sourceImageUrl, adData.ad_id)
      if (storageUrl) {
        adData.creative_url = storageUrl
      }
    }
    delete (adData as Record<string, unknown>)._source_image_url

    const { data: existing } = await db
      .from('spy_ads')
      .select('id, last_seen, weeks_in_top10')
      .eq('ad_id', adData.ad_id)
      .single()

    if (existing) {
      const lastSeenWeek = getWeekStart(new Date(existing.last_seen))
      const weeksIncrement = lastSeenWeek !== weekStart ? 1 : 0

      await db
        .from('spy_ads')
        .update({
          rank: adData.rank,
          last_seen: adData.last_seen,
          weeks_in_top10: existing.weeks_in_top10 + weeksIncrement,
          creative_url: adData.creative_url,
          video_url: adData.video_url,
          ad_copy: adData.ad_copy,
          headline: adData.headline,
          cta_type: adData.cta_type,
        })
        .eq('id', existing.id)
    } else {
      await db.from('spy_ads').insert(adData)
    }

    await db
      .from('spy_weekly_snapshots')
      .upsert(
        {
          brand_id: brandId,
          ad_id: adData.ad_id,
          week_start: weekStart,
          rank: adData.rank,
        },
        { onConflict: 'brand_id,ad_id,week_start' }
      )

    adsProcessed++
  }

  // Update brand last_scraped
  await db
    .from('spy_brands')
    .update({ last_scraped: new Date().toISOString() })
    .eq('id', brandId)

  return { ads_processed: adsProcessed, total_raw: apifyResults.length, after_dedup: finalAds.length }
}

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret (Vercel cron sends this header)
    const authHeader = req.headers.get('authorization')
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getSupabaseServer()

    // Fetch all active brands
    const { data: brands, error: brandsError } = await db
      .from('spy_brands')
      .select('*')
      .eq('status', 'active')

    if (brandsError || !brands || brands.length === 0) {
      return NextResponse.json({ error: 'No active brands found', details: brandsError }, { status: 404 })
    }

    const results: Array<{ brand: string; status: string; ads_processed?: number; error?: string }> = []

    // Process brands sequentially to avoid rate limits
    for (const brand of brands) {
      console.log(`[CRON] Scraping ${brand.brand_name} (page_id: ${brand.page_id})...`)

      try {
        // Start Apify actor run using startUrls format
        const adLibraryUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&view_all_page_id=${brand.page_id}&search_type=page&media_type=all`
        const response = await fetch(
          `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              startUrls: [{ url: adLibraryUrl }],
              resultsLimit: 20,
            }),
          }
        )

        if (!response.ok) {
          const text = await response.text()
          results.push({ brand: brand.brand_name, status: 'failed', error: `Apify start error: ${text}` })
          continue
        }

        const run = await response.json()
        const runId = run.data?.id

        if (!runId) {
          results.push({ brand: brand.brand_name, status: 'failed', error: 'No run ID returned' })
          continue
        }

        // Poll for completion
        const pollResult = await pollApifyRun(runId)

        if (pollResult.status !== 'SUCCEEDED' || !pollResult.datasetId) {
          results.push({ brand: brand.brand_name, status: 'failed', error: `Run ${pollResult.status}` })
          continue
        }

        // Process results
        const processResult = await processApifyResults(pollResult.datasetId, brand.id)
        results.push({
          brand: brand.brand_name,
          status: 'completed',
          ads_processed: processResult.ads_processed,
        })

        console.log(`[CRON] ${brand.brand_name}: ${processResult.ads_processed} ads processed`)

        // Small delay between brands to be nice to Apify
        await new Promise((resolve) => setTimeout(resolve, 2000))
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        results.push({ brand: brand.brand_name, status: 'failed', error: message })
        console.error(`[CRON] Error scraping ${brand.brand_name}:`, err)
      }
    }

    return NextResponse.json({
      status: 'completed',
      brands_processed: results.length,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[CRON] Fatal error:', err)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
