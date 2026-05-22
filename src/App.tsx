// PROTOTYPE — UI exploration for the PDex demo. Three radically different
// variants share mocked state; switch with the floating bottom bar or `?variant=`.
// Once a winner is picked, fold it into a real implementation and delete the rest.

import { useEffect, useState } from 'react'
import { PrototypeSwitcher, type VariantInfo } from './prototype/PrototypeSwitcher'
import { VariantA } from './prototype/VariantA_Dashboard'
import { VariantB } from './prototype/VariantB_Timeline'
import { VariantC } from './prototype/VariantC_Theater'

const VARIANTS: VariantInfo[] = [
  { key: 'A', name: 'Permission Dashboard' },
  { key: 'B', name: 'Ledger Timeline' },
  { key: 'C', name: 'Stage Theater' },
]

function readVariantFromUrl(): string {
  const params = new URLSearchParams(window.location.search)
  const v = (params.get('variant') ?? 'A').toUpperCase()
  return VARIANTS.some((x) => x.key === v) ? v : 'A'
}

export default function App() {
  const [variant, setVariant] = useState<string>(readVariantFromUrl)

  // Keep URL ↔ state in sync (back/forward + share-stable).
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('variant', variant)
    window.history.replaceState({}, '', url.toString())
  }, [variant])

  useEffect(() => {
    const handler = () => setVariant(readVariantFromUrl())
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  return (
    <>
      {variant === 'A' && <VariantA />}
      {variant === 'B' && <VariantB />}
      {variant === 'C' && <VariantC />}
      <PrototypeSwitcher
        variants={VARIANTS}
        current={variant}
        onChange={setVariant}
      />
    </>
  )
}
