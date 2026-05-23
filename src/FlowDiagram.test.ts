import { describe, expect, it } from 'vitest'
import { isPdBoxVisible } from './FlowDiagram'

describe('isPdBoxVisible', () => {
  it('domain phase + p3-domain completed → visible', () => {
    expect(isPdBoxVisible('domain', new Set(['p3-domain']))).toBe(true)
  })

  it('domain phase without p3-domain → hidden', () => {
    expect(isPdBoxVisible('domain', new Set())).toBe(false)
  })

  it('domain phase + both accepts but no p3-domain → hidden', () => {
    expect(isPdBoxVisible('domain', new Set(['p2-accept-a', 'p2-accept-b']))).toBe(false)
  })

  it('trading phase + both accepts completed → visible', () => {
    expect(isPdBoxVisible('trading', new Set(['p2-accept-a', 'p2-accept-b']))).toBe(true)
  })

  it('trading phase + only p2-accept-a → hidden', () => {
    expect(isPdBoxVisible('trading', new Set(['p2-accept-a']))).toBe(false)
  })

  it('trading phase + only p2-accept-b → hidden', () => {
    expect(isPdBoxVisible('trading', new Set(['p2-accept-b']))).toBe(false)
  })

  it('trading phase + nothing completed → hidden', () => {
    expect(isPdBoxVisible('trading', new Set())).toBe(false)
  })

  it('trading phase + p3-domain but neither accept → hidden', () => {
    expect(isPdBoxVisible('trading', new Set(['p3-domain']))).toBe(false)
  })

  it('setup phase is always hidden even with all steps completed', () => {
    const all = new Set(['p3-domain', 'p2-accept-a', 'p2-accept-b'])
    expect(isPdBoxVisible('setup', all)).toBe(false)
  })

  it('credentials phase is always hidden even with all steps completed', () => {
    const all = new Set(['p3-domain', 'p2-accept-a', 'p2-accept-b'])
    expect(isPdBoxVisible('credentials', all)).toBe(false)
  })

  it('redemption phase is always hidden even with all steps completed', () => {
    const all = new Set(['p3-domain', 'p2-accept-a', 'p2-accept-b'])
    expect(isPdBoxVisible('redemption', all)).toBe(false)
  })
})
