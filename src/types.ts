export type AccountRole = 'issuer' | 'domainOwner' | 'traderA' | 'traderB'

export type Badge =
  | 'TrustLine'
  | 'IOUFunded'
  | 'KYC'
  | 'DomainActive'
  | 'TradeExecuted'
  | 'Settled'

export interface Account {
  role: AccountRole
  label: string
  address: string
  xrpBalance: number
  eurfBalance: number
  badges: Badge[]
}

export type Phase =
  | 'setup'
  | 'credentials'
  | 'domain'
  | 'trading'
  | 'redemption'

export interface DemoStep {
  id: string
  phase: Phase
  actor: AccountRole
  txType: string
  title: string
  description: string
  // 'xrpl' = signed and submitted to the ledger (default).
  // 'http' = off-ledger API call to the IOU issuer (Phase 5 redemption).
  kind?: 'xrpl' | 'http'
  // What badges get added to which accounts when this step completes
  grants: Partial<Record<AccountRole, Badge[]>>
}

export interface TxResult {
  stepId: string
  hash: string
  ts: number
  ok: boolean
  message: string
  closeTime?: string
  domainId?: string
}
