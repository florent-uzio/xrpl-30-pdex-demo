import { useCallback, useMemo, useState } from 'react'
import type {
  Account,
  AccountRole,
  Badge,
  DemoStep,
  Phase,
  TxResult,
} from './types'

const fakeAddress = (seed: string) =>
  'r' + seed.padEnd(24, 'X').slice(0, 24) + '7p9q'

export const INITIAL_ACCOUNTS: Account[] = [
  {
    role: 'issuer',
    label: 'Issuer',
    address: fakeAddress('Issuer'),
    xrpBalance: 0,
    eurfBalance: 0,
    badges: [],
  },
  {
    role: 'domainOwner',
    label: 'Domain Owner',
    address: fakeAddress('DomainOwner'),
    xrpBalance: 0,
    eurfBalance: 0,
    badges: [],
  },
  {
    role: 'traderA',
    label: 'Trader A',
    address: fakeAddress('TraderA'),
    xrpBalance: 0,
    eurfBalance: 0,
    badges: [],
  },
  {
    role: 'traderB',
    label: 'Trader B',
    address: fakeAddress('TraderB'),
    xrpBalance: 0,
    eurfBalance: 0,
    badges: [],
  },
]

export const STEPS: DemoStep[] = [
  {
    id: 'p1-faucet',
    phase: 'setup',
    actor: 'issuer',
    txType: 'FaucetFund',
    title: 'Generate & fund 4 accounts via testnet faucet',
    description:
      "POST to the rippletest.net faucet for each account — generates a fresh XRPL wallet and credits ~1000 XRP. Not a signed XRPL transaction; it's an out-of-band testnet helper.",
    kind: 'http',
    grants: {},
  },
  {
    id: 'p1-trustset-a',
    phase: 'setup',
    actor: 'traderA',
    txType: 'TrustSet',
    title: 'Trader A trusts Issuer EURF',
    description: 'TrustSet — Trader A → Issuer (currency: EURF, hex-encoded)',
    grants: { traderA: ['TrustLine'] },
  },
  {
    id: 'p1-trustset-b',
    phase: 'setup',
    actor: 'traderB',
    txType: 'TrustSet',
    title: 'Trader B trusts Issuer EURF',
    description: 'TrustSet — Trader B → Issuer (currency: EURF, hex-encoded)',
    grants: { traderB: ['TrustLine'] },
  },
  {
    id: 'p1-sepa',
    phase: 'setup',
    actor: 'traderB',
    txType: 'SepaTransfer',
    title: 'Trader B sends 1000 EUR via SEPA to Issuer Bank',
    description:
      'Off-ledger SEPA payment that backs the EURF the Issuer will mint on-ledger. Trader B funds their EURF position with real EUR; the IOU represents that deposit.',
    kind: 'http',
    grants: {},
  },
  {
    id: 'p1-payment',
    phase: 'setup',
    actor: 'issuer',
    txType: 'Payment',
    title: 'Issuer sends 1000 EURF to Trader B',
    description:
      'Payment — Issuer → Trader B (1000 EURF IOU). On-ledger consequence of the SEPA deposit: the Issuer mints EURF matching the EUR received.',
    grants: { traderB: ['IOUFunded'] },
  },
  {
    id: 'p2-credcreate-a',
    phase: 'credentials',
    actor: 'issuer',
    txType: 'CredentialCreate',
    title: 'Issue KYC credential to Trader A',
    description: 'CredentialCreate — Issuer → Trader A (KYC_VERIFIED)',
    grants: {},
  },
  {
    id: 'p2-credcreate-b',
    phase: 'credentials',
    actor: 'issuer',
    txType: 'CredentialCreate',
    title: 'Issue KYC credential to Trader B',
    description: 'CredentialCreate — Issuer → Trader B (KYC_VERIFIED)',
    grants: {},
  },
  {
    id: 'p2-accept-a',
    phase: 'credentials',
    actor: 'traderA',
    txType: 'CredentialAccept',
    title: 'Trader A accepts credential',
    description: 'CredentialAccept — Trader A',
    grants: { traderA: ['KYC'] },
  },
  {
    id: 'p2-accept-b',
    phase: 'credentials',
    actor: 'traderB',
    txType: 'CredentialAccept',
    title: 'Trader B accepts credential',
    description: 'CredentialAccept — Trader B',
    grants: { traderB: ['KYC'] },
  },
  {
    id: 'p3-domain',
    phase: 'domain',
    actor: 'domainOwner',
    txType: 'PermissionedDomainSet',
    title: 'Create Permissioned Domain',
    description: 'PermissionedDomainSet — requires KYC_VERIFIED from Issuer',
    grants: { domainOwner: ['DomainActive'] },
  },
  {
    id: 'p4-offer-a',
    phase: 'trading',
    actor: 'traderA',
    txType: 'OfferCreate',
    title: 'Trader A: sell 100 XRP for 100 EURF',
    description: 'OfferCreate (with DomainID) — Trader A',
    grants: {},
  },
  {
    id: 'p4-offer-b',
    phase: 'trading',
    actor: 'traderB',
    txType: 'OfferCreate',
    title: 'Trader B: sell 100 EURF for 100 XRP → offers cross',
    description: 'OfferCreate (with DomainID) — Trader B',
    grants: { traderA: ['TradeExecuted'], traderB: ['TradeExecuted'] },
  },
  {
    id: 'p4-open-offer',
    phase: 'trading',
    actor: 'traderB',
    txType: 'OfferCreate',
    title: 'Open-book offer (no DomainID) — stays on the order book',
    description:
      'Same OfferCreate shape, DomainID omitted. In the real implementation this would not consume permissioned offers and would sit separately on the open book.',
    grants: {},
  },
  // Phase 5 — Payments on DEX: burn the IOU + off-ledger fiat redemption.
  {
    id: 'p5-burn',
    phase: 'redemption',
    actor: 'traderA',
    txType: 'Payment',
    title: 'Burn 100 EURF — return to Issuer',
    description:
      'Payment — Trader A → Issuer (100 EURF, the amount acquired in Phase 4). Returning an IOU to its issuer burns it.',
    grants: {},
  },
  {
    id: 'p5-redeem',
    phase: 'redemption',
    actor: 'issuer',
    txType: 'RedemptionRequest',
    title: 'Redeem for FIAT EUR — off-ledger settlement',
    description:
      "POST to the IOU issuer's redemption API. Credits 100 EUR to the beneficiary's bank via SEPA (1:1 with the burned EURF).",
    kind: 'http',
    grants: { traderA: ['Settled'] },
  },
]

export const PHASE_ORDER: Phase[] = [
  'setup',
  'credentials',
  'domain',
  'trading',
  'redemption',
]

export const PHASE_LABELS: Record<Phase, string> = {
  setup: 'Setup',
  credentials: 'Credentials',
  domain: 'Domain',
  trading: 'Trading',
  redemption: 'Redemption',
}

export const BADGE_LABELS: Record<Badge, string> = {
  TrustLine: 'EURF Trust Line',
  IOUFunded: 'Funded 1000 EURF',
  KYC: 'KYC_VERIFIED',
  DomainActive: 'Domain Active',
  TradeExecuted: 'Trade Executed',
  Settled: 'FIAT Settled',
}

export const NETWORK_URL = 'wss://s.altnet.rippletest.net:51233/'

export interface DemoState {
  accounts: Account[]
  completed: Set<string>
  results: TxResult[]
}

export function useMockDemo() {
  const [accounts, setAccounts] = useState<Account[]>(INITIAL_ACCOUNTS)
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [results, setResults] = useState<TxResult[]>([])

  const runStep = useCallback((step: DemoStep) => {
    if (completed.has(step.id)) return
    setAccounts((prev) =>
      prev.map((a) => {
        const granted = step.grants[a.role]
        const next = { ...a }
        if (granted) {
          const merged = Array.from(new Set([...a.badges, ...granted])) as Badge[]
          next.badges = merged
        }
        // Phase 1 — faucet: every account jumps from 0 → 1000 XRP. Same case
        // matches every role since we want all four wallets funded at once.
        if (step.id === 'p1-faucet') {
          next.xrpBalance = 1000
        }
        // Phase 1 — SEPA is off-ledger; no XRPL state changes here. The matching
        // EURF mint happens in p1-pay-iou below.
        // Phase 1: Issuer mints 1000 EURF and sends it to Trader B (who will
        // later sell it on the DEX).
        if (step.id === 'p1-payment') {
          if (a.role === 'traderB') next.eurfBalance = 1000
          if (a.role === 'issuer') next.eurfBalance = -1000
        }
        // Phase 4: permissioned offers cross when Trader B's offer lands.
        // Trader A sold XRP for EURF; Trader B is the counterparty.
        if (step.id === 'p4-offer-b') {
          if (a.role === 'traderA') {
            next.xrpBalance = a.xrpBalance - 100
            next.eurfBalance = a.eurfBalance + 100
          }
          if (a.role === 'traderB') {
            next.xrpBalance = a.xrpBalance + 100
            next.eurfBalance = a.eurfBalance - 100
          }
        }
        // Phase 5a: Trader A returns the 100 EURF acquired via the trade to
        // the Issuer, burning that portion of the IOU. The remaining 900 EURF
        // stays with Trader B.
        if (step.id === 'p5-burn') {
          if (a.role === 'traderA') next.eurfBalance = a.eurfBalance - 100
          if (a.role === 'issuer') next.eurfBalance = a.eurfBalance + 100
        }
        return next
      }),
    )
    const isHttp = step.kind === 'http'
    const hash = isHttp
      ? 'RDMP-' + Math.random().toString(16).slice(2, 8).toUpperCase()
      : (
          'PROTO' + Math.random().toString(16).slice(2, 10).toUpperCase()
        ).padEnd(16, '0')
    setResults((prev) => [
      ...prev,
      {
        stepId: step.id,
        hash,
        ts: Date.now(),
        ok: true,
        message: isHttp
          ? `${step.txType} confirmed (off-ledger)`
          : `${step.txType} validated`,
      },
    ])
    setCompleted((prev) => new Set(prev).add(step.id))
  }, [completed])

  const reset = useCallback(() => {
    setAccounts(INITIAL_ACCOUNTS)
    setCompleted(new Set())
    setResults([])
  }, [])

  const accountByRole = useMemo(() => {
    const m = new Map<AccountRole, Account>()
    for (const a of accounts) m.set(a.role, a)
    return m
  }, [accounts])

  return { accounts, accountByRole, completed, results, runStep, reset }
}
