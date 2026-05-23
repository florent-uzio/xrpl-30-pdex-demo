import { describe, expect, it } from 'vitest'
import { EURF_HEX, KYC_VERIFIED_HEX, buildTx } from './buildTx'
import { STEPS } from './mockState'
import type { Account, AccountRole } from './types'

function makeAccounts(): Map<AccountRole, Account> {
  const roles: AccountRole[] = ['issuer', 'domainOwner', 'traderA', 'traderB']
  const m = new Map<AccountRole, Account>()
  for (const role of roles) {
    m.set(role, {
      role,
      label: role,
      address: `r${role}Address`,
      xrpBalance: 1000,
      eurfBalance: 0,
      badges: [],
    })
  }
  return m
}

const ctx = { accountByRole: makeAccounts() }

function step(id: string) {
  const s = STEPS.find((s) => s.id === id)
  if (!s) throw new Error(`Unknown step id: ${id}`)
  return s
}

describe('buildTx — XRPL TransactionType', () => {
  const cases: [string, string][] = [
    ['p1-trustset-a', 'TrustSet'],
    ['p1-trustset-b', 'TrustSet'],
    ['p1-payment', 'Payment'],
    ['p2-credcreate-a', 'CredentialCreate'],
    ['p2-credcreate-b', 'CredentialCreate'],
    ['p2-accept-a', 'CredentialAccept'],
    ['p2-accept-b', 'CredentialAccept'],
    ['p3-domain', 'PermissionedDomainSet'],
    ['p4-offer-a', 'OfferCreate'],
    ['p4-offer-b', 'OfferCreate'],
    ['p4-open-offer', 'OfferCreate'],
    ['p5-burn', 'Payment'],
  ]
  for (const [id, txType] of cases) {
    it(`${id} → TransactionType="${txType}"`, () => {
      expect(buildTx(step(id), ctx).TransactionType).toBe(txType)
    })
  }
})

describe('buildTx — HTTP payload shapes', () => {
  it('p1-faucet: method=POST, 4 wallets', () => {
    const tx = buildTx(step('p1-faucet'), ctx)
    expect(tx.method).toBe('POST')
    expect(Array.isArray(tx.wallets)).toBe(true)
    expect((tx.wallets as unknown[]).length).toBe(4)
  })

  it('p1-sepa: method=POST, body has IBAN, BIC, amount, reference', () => {
    const tx = buildTx(step('p1-sepa'), ctx)
    expect(tx.method).toBe('POST')
    const body = tx.body as Record<string, unknown>
    expect(body.amount).toBe('1000.00')
    const from = body.from as Record<string, unknown>
    expect(typeof from.iban).toBe('string')
    expect(typeof from.bic).toBe('string')
    expect(typeof body.reference).toBe('string')
  })

  it('p5-redeem: body has burnTxHash from context + IBAN', () => {
    const burnTxHash = 'DEADBEEF12345678DEADBEEF12345678DEADBEEF12345678DEADBEEF12345678'
    const tx = buildTx(step('p5-redeem'), { ...ctx, burnTxHash })
    const body = tx.body as Record<string, unknown>
    expect(body.burnTxHash).toBe(burnTxHash)
    const settle = body.settle as Record<string, unknown>
    const dest = settle.destination as Record<string, unknown>
    expect(typeof dest.iban).toBe('string')
  })

  it('p5-redeem: burnTxHash falls back to placeholder when not in context', () => {
    const tx = buildTx(step('p5-redeem'), ctx)
    const body = tx.body as Record<string, unknown>
    expect(body.burnTxHash).toBe('<hash from p5-burn>')
  })
})

describe('buildTx — EURF hex encoding', () => {
  it('EURF_HEX is 40 chars', () => {
    expect(EURF_HEX).toHaveLength(40)
  })

  it('p1-trustset-a LimitAmount.currency is EURF_HEX', () => {
    const limit = buildTx(step('p1-trustset-a'), ctx).LimitAmount as Record<string, unknown>
    expect(limit.currency).toBe(EURF_HEX)
  })

  it('p1-trustset-b LimitAmount.currency is EURF_HEX', () => {
    const limit = buildTx(step('p1-trustset-b'), ctx).LimitAmount as Record<string, unknown>
    expect(limit.currency).toBe(EURF_HEX)
  })

  it('p1-payment Amount.currency is EURF_HEX', () => {
    const amount = buildTx(step('p1-payment'), ctx).Amount as Record<string, unknown>
    expect(amount.currency).toBe(EURF_HEX)
  })
})

describe('buildTx — KYC_VERIFIED hex', () => {
  it('p2-credcreate-a CredentialType is KYC_VERIFIED_HEX', () => {
    expect(buildTx(step('p2-credcreate-a'), ctx).CredentialType).toBe(KYC_VERIFIED_HEX)
  })

  it('p2-credcreate-b CredentialType is KYC_VERIFIED_HEX', () => {
    expect(buildTx(step('p2-credcreate-b'), ctx).CredentialType).toBe(KYC_VERIFIED_HEX)
  })

  it('p2-accept-a CredentialType is KYC_VERIFIED_HEX', () => {
    expect(buildTx(step('p2-accept-a'), ctx).CredentialType).toBe(KYC_VERIFIED_HEX)
  })

  it('p2-accept-b CredentialType is KYC_VERIFIED_HEX', () => {
    expect(buildTx(step('p2-accept-b'), ctx).CredentialType).toBe(KYC_VERIFIED_HEX)
  })
})

describe('buildTx — DomainID', () => {
  it('p4-offer-a includes DomainID from context', () => {
    const domainId = 'ABCDEF12'.repeat(8)
    expect(buildTx(step('p4-offer-a'), { ...ctx, domainId }).DomainID).toBe(domainId)
  })

  it('p4-offer-b includes DomainID from context', () => {
    const domainId = 'ABCDEF12'.repeat(8)
    expect(buildTx(step('p4-offer-b'), { ...ctx, domainId }).DomainID).toBe(domainId)
  })

  it('p4-offer-a falls back to FAKE_DOMAIN_ID when context has no domainId', () => {
    const tx = buildTx(step('p4-offer-a'), ctx)
    expect(typeof tx.DomainID).toBe('string')
    expect((tx.DomainID as string).length).toBe(64)
  })

  it('p4-open-offer has no DomainID', () => {
    expect(buildTx(step('p4-open-offer'), ctx).DomainID).toBeUndefined()
  })

  it('p4-open-offer has no DomainID even when context provides one', () => {
    const tx = buildTx(step('p4-open-offer'), { ...ctx, domainId: 'SOME_DOMAIN' })
    expect(tx.DomainID).toBeUndefined()
  })
})
