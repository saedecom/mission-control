import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const STORAGE_BUCKET = 'ad-creatives'

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

export async function POST() {
  try {
    const db = getSupabaseServer()

    // Find all ads with null creative_url
    const { data: brokenAds, error } = await db
      .from('spy_ads')
      .select('id, ad_id, ad_library_link')
      .is('creative_url', null)

    if (error || !brokenAds?.length) {
      return NextResponse.json({ repaired: 0, total: 0, message: 'No ads to repair' })
    }

    let repaired = 0
    const failed: string[] = []

    for (const ad of brokenAds) {
      // Try fetching the ad image from Facebook Ad Library's rendered ad endpoint
      const adId = ad.ad_id
      // Facebook stores ad preview images at predictable CDN paths
      const fbImageUrls = [
        `https://external.xx.fbcdn.net/ads/image/?d=AQ${adId}`,
        `https://scontent.xx.fbcdn.net/v/t45.1600-4/${adId}_0_0_n.png`,
      ]

      let storageUrl: string | null = null

      // Try the Ad Library page itself to find the image
      try {
        const pageRes = await fetch(
          `https://www.facebook.com/ads/library/?id=${adId}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
          }
        )
        if (pageRes.ok) {
          const html = await pageRes.text()
          // Look for og:image or image URLs in the page
          const ogMatch = html.match(/property="og:image"\s+content="([^"]+)"/)
          if (ogMatch?.[1]) {
            const ogUrl = ogMatch[1].replace(/&amp;/g, '&')
            storageUrl = await uploadToStorage(ogUrl, adId)
          }

          // Try finding image in page content
          if (!storageUrl) {
            const imgMatch = html.match(/https:\/\/scontent[^"'\s]+/)
            if (imgMatch?.[0]) {
              const imgUrl = imgMatch[0].replace(/&amp;/g, '&')
              storageUrl = await uploadToStorage(imgUrl, adId)
            }
          }
        }
      } catch {
        // Page fetch failed, try CDN URLs directly
      }

      // Fallback: try CDN URLs directly
      if (!storageUrl) {
        for (const url of fbImageUrls) {
          storageUrl = await uploadToStorage(url, adId)
          if (storageUrl) break
        }
      }

      if (storageUrl) {
        await db
          .from('spy_ads')
          .update({ creative_url: storageUrl })
          .eq('id', ad.id)
        repaired++
      } else {
        failed.push(adId)
      }
    }

    return NextResponse.json({
      total: brokenAds.length,
      repaired,
      failed: failed.length,
      failed_ids: failed,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
