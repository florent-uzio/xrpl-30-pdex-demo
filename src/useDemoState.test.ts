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
  },
}))

import { useDemoState } from './useDemoState'
import { STEPS } from './mockState'

const faucetStep = STEPS.find((s) => s.id === 'p1-faucet')!

afterEach(() => {
  localStorage.clear()
  addressCounter = 0
})

describe('useDemoState', () => {
  it('faucet step populates completed + addresses; reset clears state', async () => {
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
})
