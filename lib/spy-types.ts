export const ASSET_TYPES = [
  'UGC',
  'High Production',
  'Static Image',
  'Animation',
  'Screen Recording',
  'Stock Footage',
] as const

export const VISUAL_FORMATS = [
  'Talking Head',
  'Product Demo',
  'Unboxing',
  'Before/After',
  'Split Screen',
  'Text Overlay',
  'Lifestyle',
  'Testimonial',
  'Tutorial',
  'Montage',
] as const

export const MESSAGING_ANGLES = [
  'Problem/Solution',
  'Social Proof',
  'FOMO',
  'Aspiration',
  'Value Proposition',
  'Fear/Pain',
  'Curiosity',
  'Authority',
  'Comparison',
  'Transformation',
  'Humor',
  'Urgency',
  'Exclusivity',
  'Community',
] as const

export const HOOK_TACTICS = [
  'Pattern Interrupt',
  'Question',
  'Bold Claim',
  'Curiosity Gap',
  'Controversy',
  'Relatable Scenario',
  'Shocking Stat',
  'Direct Address',
  'Visual Surprise',
  'Sound Effect',
  'Text Hook',
  'Celebrity/Influencer',
  'Unboxing Reveal',
] as const

export const OFFER_TYPES = [
  'Percentage Off',
  'Dollar Amount Off',
  'Free Shipping',
  'BOGO',
  'Free Trial',
  'Free Gift',
  'Bundle Deal',
  'Subscribe & Save',
  'Limited Time',
  'No Offer',
] as const

export type AssetType = (typeof ASSET_TYPES)[number]
export type VisualFormat = (typeof VISUAL_FORMATS)[number]
export type MessagingAngle = (typeof MESSAGING_ANGLES)[number]
export type HookTactic = (typeof HOOK_TACTICS)[number]
export type OfferType = (typeof OFFER_TYPES)[number]

export interface SpyBrand {
  id: string
  brand_name: string
  website_url: string | null
  ad_library_url: string
  page_id: string
  vertical: string | null
  status: 'active' | 'paused'
  last_scraped: string | null
  created_at: string
}

export interface SpyAd {
  id: string
  ad_id: string
  brand_id: string
  rank: number | null
  creative_type: 'video' | 'image'
  creative_url: string | null
  video_url: string | null
  ad_copy: string | null
  headline: string | null
  cta_type: string | null
  start_date: string | null
  ad_library_link: string | null
  asset_type: AssetType | null
  visual_format: VisualFormat | null
  messaging_angle: MessagingAngle | null
  hook_tactic: HookTactic | null
  offer_type: OfferType | null
  first_seen: string
  last_seen: string
  weeks_in_top10: number
  bookmarked: boolean
  created_at: string
  // Joined fields
  brand_name?: string
}

export interface SpyWeeklySnapshot {
  id: string
  brand_id: string
  ad_id: string
  week_start: string
  rank: number
}

export interface SpyIntelReport {
  id: string
  report: string
  ads_analyzed: number
  generated_at: string
}
