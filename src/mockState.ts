import { useCallback, useMemo, useState } from 'react'
import type {
  Account,
  AccountRole,
  Badge,
  DemoStep,
  Phase,
  TxResult,
} from './types'

// Hex-encoded `KYC_VERIFIED` credential type (XRPL requires hex for CredentialType).
const KYC_VERIFIED_HEX = '4B59435F564552494649454400000000'

// EURF is a 4-character currency code, so XRPL requires the 40-char hex form
// ('EURF' → 0x45 0x55 0x52 0x46, then padded with zeros to 20 bytes).
// USD is 3 chars so it stays as the plain ASCII string in transaction JSON.
const EURF_HEX = '4555524600000000000000000000000000000000'

// Fake but realistic-looking 64-char hex domain id for the OfferCreate preview.
const FAKE_DOMAIN_ID =
  'D0E1B5C0FFEEDA7AD0E1B5C0FFEEDA7AD0E1B5C0FFEEDA7AD0E1B5C0FFEEDA7A'

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
    id: 'p1-pay-iou',
    phase: 'setup',
    actor: 'issuer',
    txType: 'Payment',
    title: 'Issuer sends 1000 EURF to Trader B',
    description:
      'Payment — Issuer → Trader B (1000 EURF IOU). On-ledger consequence of the SEPA deposit: the Issuer mints EURF matching the EUR received.',
    grants: { traderB: ['IOUFunded'] },
  },
  {
    id: 'p2-cred-a',
    phase: 'credentials',
    actor: 'issuer',
    txType: 'CredentialCreate',
    title: 'Issue KYC credential to Trader A',
    description: 'CredentialCreate — Issuer → Trader A (KYC_VERIFIED)',
    grants: {},
  },
  {
    id: 'p2-cred-b',
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
    id: 'p4-offer-open',
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
        if (step.id === 'p1-pay-iou') {
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

// Builds the transaction JSON that would be signed and submitted for a step.
// Realistic XRPL field names; values reference the actual mock addresses so the
// JSON shown in the inspector matches the cards above. Fee shown as a constant
// (12 drops) since drops are pedagogically useful; Sequence/LastLedgerSequence
// omitted as they are autofilled at signing time.
export function buildTxJson(
  step: DemoStep,
  accountByRole: Map<AccountRole, Account>,
): Record<string, unknown> {
  const issuer = accountByRole.get('issuer')!
  const traderA = accountByRole.get('traderA')!
  const traderB = accountByRole.get('traderB')!
  const domainOwner = accountByRole.get('domainOwner')!

  switch (step.id) {
    case 'p1-faucet':
      // Not a signed XRPL transaction — a testnet faucet HTTP call, repeated
      // per account. In real impl this maps to `client.fundWallet()` × 4.
      return {
        method: 'POST',
        url: 'https://faucet.altnet.rippletest.net/accounts',
        calls: 4,
        wallets: [
          { role: 'Issuer', address: issuer.address, funded: '~1000 XRP' },
          {
            role: 'Domain Owner',
            address: domainOwner.address,
            funded: '~1000 XRP',
          },
          { role: 'Trader A', address: traderA.address, funded: '~1000 XRP' },
          { role: 'Trader B', address: traderB.address, funded: '~1000 XRP' },
        ],
      }
    case 'p1-sepa':
      // Off-ledger SEPA payment. Trader B's bank instructs a transfer to the
      // Issuer's bank account; the EUR balance there backs the EURF that will
      // be minted on-ledger in the next step.
      return {
        method: 'POST',
        url: 'https://traderbank.example.com/v1/sepa/transfers',
        headers: {
          Authorization: 'Bearer ${TRADER_B_API_KEY}',
          'Content-Type': 'application/json',
        },
        body: {
          from: {
            name: 'Trader B',
            iban: 'DE89 3704 0044 0532 0130 00',
            bic: 'COBADEFFXXX',
          },
          to: {
            name: 'Issuer Bank',
            iban: 'FR14 2004 1010 0505 0001 3M02 606',
            bic: 'BNPAFRPPXXX',
          },
          amount: '1000.00',
          currency: 'EUR',
          rail: 'SEPA',
          reference: `Backing for EURF mint to ${traderB.address}`,
        },
      }
    case 'p1-trustset-a':
      return {
        TransactionType: 'TrustSet',
        Account: traderA.address,
        LimitAmount: {
          currency: EURF_HEX,
          issuer: issuer.address,
          value: '1000000',
        },
        Fee: '12',
      }
    case 'p1-trustset-b':
      return {
        TransactionType: 'TrustSet',
        Account: traderB.address,
        LimitAmount: {
          currency: EURF_HEX,
          issuer: issuer.address,
          value: '1000000',
        },
        Fee: '12',
      }
    case 'p1-pay-iou':
      return {
        TransactionType: 'Payment',
        Account: issuer.address,
        Destination: traderB.address,
        Amount: {
          currency: EURF_HEX,
          issuer: issuer.address,
          value: '1000',
        },
        Fee: '12',
      }
    case 'p2-cred-a':
      return {
        TransactionType: 'CredentialCreate',
        Account: issuer.address,
        Subject: traderA.address,
        CredentialType: KYC_VERIFIED_HEX,
        Fee: '12',
      }
    case 'p2-cred-b':
      return {
        TransactionType: 'CredentialCreate',
        Account: issuer.address,
        Subject: traderB.address,
        CredentialType: KYC_VERIFIED_HEX,
        Fee: '12',
      }
    case 'p2-accept-a':
      return {
        TransactionType: 'CredentialAccept',
        Account: traderA.address,
        Issuer: issuer.address,
        CredentialType: KYC_VERIFIED_HEX,
        Fee: '12',
      }
    case 'p2-accept-b':
      return {
        TransactionType: 'CredentialAccept',
        Account: traderB.address,
        Issuer: issuer.address,
        CredentialType: KYC_VERIFIED_HEX,
        Fee: '12',
      }
    case 'p3-domain':
      return {
        TransactionType: 'PermissionedDomainSet',
        Account: domainOwner.address,
        AcceptedCredentials: [
          {
            Credential: {
              Issuer: issuer.address,
              CredentialType: KYC_VERIFIED_HEX,
            },
          },
        ],
        Fee: '12',
      }
    case 'p4-offer-a':
      // Trader A sells 100 XRP for 100 EURF. TakerGets = what the taker
      // receives (XRP drops, what Trader A gives up); TakerPays = what the
      // taker pays (EURF IOU, what Trader A receives). EURF is 4 chars so the
      // currency field is the 40-char hex form, not the ASCII string.
      return {
        TransactionType: 'OfferCreate',
        Account: traderA.address,
        TakerGets: '100000000',
        TakerPays: {
          currency: EURF_HEX,
          issuer: issuer.address,
          value: '100',
        },
        DomainID: FAKE_DOMAIN_ID,
        Fee: '12',
      }
    case 'p4-offer-b':
      // Trader B sells 100 EURF for 100 XRP — opposite of the above.
      return {
        TransactionType: 'OfferCreate',
        Account: traderB.address,
        TakerGets: {
          currency: EURF_HEX,
          issuer: issuer.address,
          value: '100',
        },
        TakerPays: '100000000',
        DomainID: FAKE_DOMAIN_ID,
        Fee: '12',
      }
    case 'p4-offer-open':
      // Same OfferCreate shape, DomainID omitted. In production this offer
      // would sit on the open order book and would not consume the permissioned
      // offers above.
      return {
        TransactionType: 'OfferCreate',
        Account: traderB.address,
        TakerGets: {
          currency: EURF_HEX,
          issuer: issuer.address,
          value: '50',
        },
        TakerPays: '50000000',
        Fee: '12',
      }
    case 'p5-burn':
      // Returning EURF to its issuer burns that portion of the IOU. Trader A
      // returns the 100 EURF they acquired via the Phase 4 trade.
      return {
        TransactionType: 'Payment',
        Account: traderA.address,
        Destination: issuer.address,
        Amount: {
          currency: EURF_HEX,
          issuer: issuer.address,
          value: '100',
        },
        Fee: '12',
      }
    case 'p5-redeem':
      // Not an XRPL transaction — an off-ledger API call to the IOU issuer.
      // The inspector treats `kind: 'http'` steps differently (different
      // header text and submit-button label).
      return {
        method: 'POST',
        url: 'https://issuer.example.com/v1/redemptions',
        headers: {
          Authorization: 'Bearer ${ISSUER_API_KEY}',
          'Content-Type': 'application/json',
        },
        body: {
          burnTxHash: '<hash from p5-burn>',
          subject: traderA.address,
          burned: {
            currency: 'EURF',
            amount: '100',
          },
          settle: {
            currency: 'EUR',
            amount: '100',
            destination: {
              beneficiary: 'Trader A',
              rail: 'SEPA',
              iban: 'FR76 3000 4000 0312 3456 7890 123',
              bic: 'BNPAFRPPXXX',
            },
          },
        },
      }
    default:
      return { TransactionType: step.txType, Account: '<unknown>' }
  }
}
