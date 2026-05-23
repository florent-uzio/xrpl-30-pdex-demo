import { renderHook, act } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

let addressCounter = 0

vi.mock('./xrplClient', () => ({
  xrplClient: {
    isConnected: () => false,
    connect: vi.fn().mockResolvedValue(undefined),
    fundWallet: vi.fn().mockImplementation(async () => ({
      wallet: { classicAddress: `rTestAddress${addressCounter++}` },
      balance: 1000,
    })),
    submitAndWait: vi.fn().mockImplementation(async (tx: Record<string, unknown>) => {
      const meta: Record<string, unknown> = { TransactionResult: 'tesSUCCESS' }
      if (tx.TransactionType === 'PermissionedDomainSet') {
        meta.AffectedNodes = [
          {
            CreatedNode: {
              LedgerEntryType: 'PermissionedDomain',
              LedgerIndex: 'DOMAIN0000000000000000000000000000000000000000000000000000000001',
              NewFields: {},
            },
          },
        ]
      }
      return {
        result: {
          hash: `HASH${String(tx.TransactionType)}`.padEnd(16, '0'),
          date: 0,
          meta,
          validated: true,
        },
      }
    }),
  },
}))

import { useDemoState } from './useDemoState'
import { STEPS } from './mockState'

afterEach(() => {
  localStorage.clear()
  addressCounter = 0
})

describe('useDemoState', () => {
  it('faucet step populates completed + addresses; reset clears state', async () => {
    const faucetStep = STEPS.find((s) => s.id === 'p1-faucet')!
    const { result } = renderHook(() => useDemoState())

    // Reset any leftover module-level wallet state from prior runs.
    act(() => { result.current.reset() })

    await act(async () => {
      await result.current.runStep(faucetStep)
    })

    // p1-faucet is marked completed
    expect(result.current.completed.has('p1-faucet')).toBe(true)

    // All four accounts have real (non-placeholder) addresses
    const roles = ['issuer', 'domainOwner', 'traderA', 'traderB'] as const
    for (const role of roles) {
      const account = result.current.accountByRole.get(role)!
      expect(account.address).toMatch(/^rTestAddress\d+$/)
    }

    // reset() clears completed and localStorage
    act(() => { result.current.reset() })

    expect(result.current.completed.size).toBe(0)
    expect(localStorage.getItem('pdex-completed')).toBeNull()
    expect(localStorage.getItem('pdex-results')).toBeNull()
  })

  it('Phase 1 full path accumulates correct badges and EURF balance', async () => {
    const { result } = renderHook(() => useDemoState())
    act(() => { result.current.reset() })

    const step = (id: string) => STEPS.find((s) => s.id === id)!

    await act(async () => { await result.current.runStep(step('p1-faucet')) })
    await act(async () => { await result.current.runStep(step('p1-trustset-a')) })
    await act(async () => { await result.current.runStep(step('p1-trustset-b')) })
    await act(async () => { await result.current.runStep(step('p1-sepa')) })
    await act(async () => { await result.current.runStep(step('p1-payment')) })

    const traderA = result.current.accountByRole.get('traderA')!
    const traderB = result.current.accountByRole.get('traderB')!

    expect(traderA.badges).toContain('TrustLine')
    expect(traderB.badges).toContain('TrustLine')
    expect(traderB.badges).toContain('IOUFunded')
    expect(traderB.eurfBalance).toBe(1000)

    for (const id of ['p1-faucet', 'p1-trustset-a', 'p1-trustset-b', 'p1-sepa', 'p1-payment']) {
      expect(result.current.completed.has(id)).toBe(true)
    }

    // tx hash and closeTime stored in results for XRPL steps
    const trustAResult = result.current.results.find((r) => r.stepId === 'p1-trustset-a')!
    expect(trustAResult.ok).toBe(true)
    expect(trustAResult.hash).not.toBe('N/A')
    expect(trustAResult.closeTime).toBeDefined()
  })

  it('Phase 2: KYC badge appears only after CredentialAccept, not CredentialCreate', async () => {
    const { result } = renderHook(() => useDemoState())
    act(() => { result.current.reset() })

    const step = (id: string) => STEPS.find((s) => s.id === id)!

    await act(async () => { await result.current.runStep(step('p1-faucet')) })

    await act(async () => { await result.current.runStep(step('p2-credcreate-a')) })
    expect(result.current.accountByRole.get('traderA')!.badges).not.toContain('KYC')

    await act(async () => { await result.current.runStep(step('p2-credcreate-b')) })
    expect(result.current.accountByRole.get('traderB')!.badges).not.toContain('KYC')

    await act(async () => { await result.current.runStep(step('p2-accept-a')) })
    expect(result.current.accountByRole.get('traderA')!.badges).toContain('KYC')
    expect(result.current.completed.has('p2-accept-a')).toBe(true)

    await act(async () => { await result.current.runStep(step('p2-accept-b')) })
    expect(result.current.accountByRole.get('traderB')!.badges).toContain('KYC')
    expect(result.current.completed.has('p2-accept-b')).toBe(true)

    const createAResult = result.current.results.find((r) => r.stepId === 'p2-credcreate-a')!
    expect(createAResult.ok).toBe(true)
    expect(createAResult.hash).not.toBe('N/A')
    expect(createAResult.closeTime).toBeDefined()
  })

  it('Phase 3: DomainActive badge on domainOwner, DomainID captured in result', async () => {
    const { result } = renderHook(() => useDemoState())
    act(() => { result.current.reset() })

    const step = (id: string) => STEPS.find((s) => s.id === id)!

    await act(async () => { await result.current.runStep(step('p1-faucet')) })
    await act(async () => { await result.current.runStep(step('p3-domain')) })

    expect(result.current.accountByRole.get('domainOwner')!.badges).toContain('DomainActive')
    expect(result.current.completed.has('p3-domain')).toBe(true)

    const domainResult = result.current.results.find((r) => r.stepId === 'p3-domain')!
    expect(domainResult.ok).toBe(true)
    expect(domainResult.hash).not.toBe('N/A')
    expect(domainResult.closeTime).toBeDefined()
    expect(domainResult.domainId).toBe(
      'DOMAIN0000000000000000000000000000000000000000000000000000000001',
    )
  })
})
