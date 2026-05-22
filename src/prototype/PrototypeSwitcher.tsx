// PROTOTYPE — floating bottom bar that cycles between UI variants. Hidden in
// production builds; not part of the design being evaluated.

import { useEffect } from 'react'
import { ChevronLeft, ChevronRight, FlaskConical } from 'lucide-react'

export interface VariantInfo {
  key: string
  name: string
}

interface Props {
  variants: VariantInfo[]
  current: string
  onChange: (key: string) => void
}

export function PrototypeSwitcher({ variants, current, onChange }: Props) {
  const idx = Math.max(
    0,
    variants.findIndex((v) => v.key === current),
  )
  const currentVariant = variants[idx]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          target.isContentEditable
        )
          return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onChange(variants[(idx - 1 + variants.length) % variants.length].key)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        onChange(variants[(idx + 1) % variants.length].key)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [idx, variants, onChange])

  if (import.meta.env.PROD) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-amber-400/95 text-slate-900 shadow-2xl ring-1 ring-amber-600/60 backdrop-blur">
        <FlaskConical className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-wider">
          Prototype
        </span>
        <div className="w-px h-5 bg-slate-900/30 mx-1" />
        <button
          aria-label="Previous variant"
          onClick={() =>
            onChange(variants[(idx - 1 + variants.length) % variants.length].key)
          }
          className="p-1 rounded-full hover:bg-slate-900/10 active:bg-slate-900/20"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="px-2 text-sm font-semibold min-w-[180px] text-center">
          {currentVariant.key} — {currentVariant.name}
        </div>
        <button
          aria-label="Next variant"
          onClick={() => onChange(variants[(idx + 1) % variants.length].key)}
          className="p-1 rounded-full hover:bg-slate-900/10 active:bg-slate-900/20"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <span className="hidden sm:inline ml-2 text-[10px] font-mono opacity-70">
          ← →
        </span>
      </div>
    </div>
  )
}
