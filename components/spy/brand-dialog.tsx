'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { extractPageIdFromUrl } from '@/lib/spy-utils'

interface BrandDialogProps {
  onBrandAdded: () => void
}

export function BrandDialog({ onBrandAdded }: BrandDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    brand_name: '',
    website_url: '',
    ad_library_url: '',
    vertical: '',
  })
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.brand_name || !form.ad_library_url) {
      setError('Brand name and Ad Library URL are required')
      return
    }

    const pageId = extractPageIdFromUrl(form.ad_library_url)
    if (!pageId) {
      setError('Could not extract page ID from Ad Library URL. Make sure it contains view_all_page_id=')
      return
    }

    setLoading(true)
    const { error: dbError } = await supabase.from('spy_brands').insert({
      brand_name: form.brand_name,
      website_url: form.website_url || null,
      ad_library_url: form.ad_library_url,
      page_id: pageId,
      vertical: form.vertical || null,
      status: 'active',
    })

    setLoading(false)

    if (dbError) {
      setError(dbError.message)
      return
    }

    setForm({ brand_name: '', website_url: '', ad_library_url: '', vertical: '' })
    setOpen(false)
    onBrandAdded()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="h-4 w-4 mr-1" />
        Add Brand
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Brand to Monitor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brand_name">Brand Name *</Label>
            <Input
              id="brand_name"
              value={form.brand_name}
              onChange={(e) => setForm((f) => ({ ...f, brand_name: e.target.value }))}
              placeholder="e.g. AG1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ad_library_url">Ad Library URL *</Label>
            <Input
              id="ad_library_url"
              value={form.ad_library_url}
              onChange={(e) => setForm((f) => ({ ...f, ad_library_url: e.target.value }))}
              placeholder="https://www.facebook.com/ads/library/?...view_all_page_id=123456"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website_url">Website URL</Label>
            <Input
              id="website_url"
              value={form.website_url}
              onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))}
              placeholder="https://drinkag1.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vertical">Vertical</Label>
            <Input
              id="vertical"
              value={form.vertical}
              onChange={(e) => setForm((f) => ({ ...f, vertical: e.target.value }))}
              placeholder="e.g. Health & Wellness"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Adding...' : 'Add Brand'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
