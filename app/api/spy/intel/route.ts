import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!

export async function POST() {
  try {
    // Get all analyzed ads with brand names
    const { data: ads, error } = await getSupabaseServer()
      .from('spy_ads')
      .select('*, spy_brands(brand_name)')
      .not('asset_type', 'is', null)
      .order('weeks_in_top10', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!ads || ads.length === 0) {
      return NextResponse.json({ error: 'No analyzed ads to generate report from' }, { status: 400 })
    }

    // Build ad summaries for the prompt
    const adSummaries = ads.map((ad) => {
      const brandName = (ad.spy_brands as { brand_name: string } | null)?.brand_name || 'Unknown'
      return `- Brand: ${brandName} | Type: ${ad.asset_type} | Format: ${ad.visual_format} | Angle: ${ad.messaging_angle} | Hook: ${ad.hook_tactic} | Offer: ${ad.offer_type} | Weeks in Top 10: ${ad.weeks_in_top10} | Headline: "${ad.headline || 'N/A'}" | Copy preview: "${(ad.ad_copy || '').slice(0, 200)}"`
    }).join('\n')

    const prompt = `You are a senior creative strategist analyzing the top-performing DTC Facebook ads. Based on the following ${ads.length} ads currently running, generate a creative intelligence report.

ADS DATA:
${adSummaries}

Generate a comprehensive report in markdown format with these sections:

## Executive Summary
Brief overview of key patterns across all monitored brands.

## Common Patterns
What messaging angles, visual formats, and asset types dominate? Any surprising trends?

## Winning Hooks
Quote the most effective hooks from the ad copy. What makes them work?

## Top Frameworks
Identify the 3-5 most common ad frameworks being used (e.g., Problem-Agitate-Solution, Testimonial-to-CTA, etc.)

## Brand Spotlight
Call out any brand doing something unique or particularly effective.

## Actionable Takeaways
5 specific, actionable recommendations for creating winning ads based on these patterns.

Be specific and reference actual ad data. No generic advice.`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
        }),
      }
    )

    if (!geminiRes.ok) {
      const text = await geminiRes.text()
      return NextResponse.json({ error: `Gemini error: ${text}` }, { status: 500 })
    }

    const geminiData = await geminiRes.json()
    const report = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Save report
    const { data: saved, error: saveError } = await getSupabaseServer()
      .from('spy_intel_reports')
      .insert({
        report,
        ads_analyzed: ads.length,
        generated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500 })
    }

    return NextResponse.json(saved)
  } catch (err) {
    console.error('Intel report error:', err)
    return NextResponse.json({ error: 'Failed to generate intel report' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { data, error } = await getSupabaseServer()
      .from('spy_intel_reports')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      return NextResponse.json({ report: null })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ report: null })
  }
}
