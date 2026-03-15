import { NextRequest, NextResponse } from 'next/server'
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

export async function POST(req: NextRequest) {
  try {
    const { ad_id } = await req.json()

    const { data: ad, error } = await getSupabaseServer()
      .from('spy_ads')
      .select('*')
      .eq('id', ad_id)
      .single()

    if (error || !ad) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
    }

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
      const text = await geminiRes.text()
      return NextResponse.json({ error: `Gemini error: ${text}` }, { status: 500 })
    }

    const geminiData = await geminiRes.json()
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Parse JSON from response (handle potential markdown fences)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    const tags = JSON.parse(jsonMatch[0])

    // Update ad with AI tags
    await getSupabaseServer()
      .from('spy_ads')
      .update({
        asset_type: tags.asset_type,
        visual_format: tags.visual_format,
        messaging_angle: tags.messaging_angle,
        hook_tactic: tags.hook_tactic,
        offer_type: tags.offer_type,
      })
      .eq('id', ad_id)

    return NextResponse.json({ tags })
  } catch (err) {
    console.error('Analyze error:', err)
    return NextResponse.json({ error: 'Failed to analyze ad' }, { status: 500 })
  }
}
