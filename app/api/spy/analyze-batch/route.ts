import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!

const ANALYSIS_PROMPT = `You are a DTC advertising analyst. Analyze this Facebook ad and classify it across 5 dimensions.

Ad Copy: {ad_copy}
Headline: {headline}
Creative Type: {creative_type}
CTA: {cta_type}

Respond with ONLY a JSON object (no markdown, no code fences):
{
  "asset_type": one of ["UGC", "High Production", "Static Image", "Animation", "Screen Recording", "Stock Footage"],
  "visual_format": one of ["Talking Head", "Product Demo", "Unboxing", "Before/After", "Split Screen", "Text Overlay", "Lifestyle", "Testimonial", "Tutorial", "Montage"],
  "messaging_angle": one of ["Problem/Solution", "Social Proof", "FOMO", "Aspiration", "Value Proposition", "Fear/Pain", "Curiosity", "Authority", "Comparison", "Transformation", "Humor", "Urgency", "Exclusivity", "Community"],
  "hook_tactic": one of ["Pattern Interrupt", "Question", "Bold Claim", "Curiosity Gap", "Controversy", "Relatable Scenario", "Shocking Stat", "Direct Address", "Visual Surprise", "Sound Effect", "Text Hook", "Celebrity/Influencer", "Unboxing Reveal"],
  "offer_type": one of ["Percentage Off", "Dollar Amount Off", "Free Shipping", "BOGO", "Free Trial", "Free Gift", "Bundle Deal", "Subscribe & Save", "Limited Time", "No Offer"]
}`

export async function POST() {
  try {
    // Get all unanalyzed ads
    const { data: ads, error } = await getSupabaseServer()
      .from('spy_ads')
      .select('*')
      .is('asset_type', null)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!ads || ads.length === 0) {
      return NextResponse.json({ analyzed: 0, message: 'No unanalyzed ads found' })
    }

    let analyzed = 0
    let failed = 0

    for (const ad of ads) {
      try {
        const prompt = ANALYSIS_PROMPT
          .replace('{ad_copy}', ad.ad_copy || 'N/A')
          .replace('{headline}', ad.headline || 'N/A')
          .replace('{creative_type}', ad.creative_type || 'N/A')
          .replace('{cta_type}', ad.cta_type || 'N/A')

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.1 },
            }),
          }
        )

        if (!geminiRes.ok) {
          failed++
          continue
        }

        const geminiData = await geminiRes.json()
        const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)

        if (!jsonMatch) {
          failed++
          continue
        }

        const tags = JSON.parse(jsonMatch[0])

        await getSupabaseServer()
          .from('spy_ads')
          .update({
            asset_type: tags.asset_type,
            visual_format: tags.visual_format,
            messaging_angle: tags.messaging_angle,
            hook_tactic: tags.hook_tactic,
            offer_type: tags.offer_type,
          })
          .eq('id', ad.id)

        analyzed++

        // Rate limit: ~100ms between calls
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch {
        failed++
      }
    }

    return NextResponse.json({ analyzed, failed, total: ads.length })
  } catch (err) {
    console.error('Batch analyze error:', err)
    return NextResponse.json({ error: 'Failed to batch analyze' }, { status: 500 })
  }
}
