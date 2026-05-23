import { useCallback, useMemo, useState } from 'react'
import type { Wallet } from 'xrpl'
import { INITIAL_ACCOUNTS } from './mockState'
import { xrplClient } from './xrplClient'
import type { Account, AccountRole, Badge, DemoStep, TxResult } from './types'

const LS_COMPLETED = 'pdex-completed'
const LS_RESULTS = 'pdex-results'

// Wallets in module-level state — survive re-renders, not a page refresh.
let walletStore: Map<AccountRole, Wallet> = new Map()

function readCompleted(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_COMPLETED)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function readResults(): TxResult[] {
  try {
    const raw = localStorage.getItem(LS_RESULTS)
    return raw ? (JSON.parse(raw) as TxResult[]) : []
  } catch {
    return []
  }
}

function buildAccounts(): Account[] {
  if (walletStore.size === 0) return INITIAL_ACCOUNTS
  return INITIAL_ACCOUNTS.map((a) => {
    const w = walletStore.get(a.role)
    return w ? { ...a, address: w.classicAddress, xrpBalance: 1000 } : a
  })
}

export function useDemoState() {
  const [accounts, setAccounts] = useState<Account[]>(buildAccounts)
  const [completed, setCompleted] = useState<Set<string>>(readCompleted)
  const [results, setResults] = useState<TxResult[]>(readResults)

  const runStep = useCallback(
    async (step: DemoStep) => {
      if (completed.has(step.id)) return

      if (step.id === 'p1-faucet') {
        const roles: AccountRole[] = ['issuer', 'domainOwner', 'traderA', 'traderB']
        const funded: { role: AccountRole; address: string; balance: number }[] = []

        try {
          if (!xrplClient.isConnected()) await xrplClient.connect()
          for (const role of roles) {
            const { wallet, balance } = await xrplClient.fundWallet()
            walletStore.set(role, wallet)
            funded.push({ role, address: wallet.classicAddress, balance })
          }
        } catch (err) {
          const errResult: TxResult = {
            stepId: step.id,
            hash: 'N/A',
            ts: Date.now(),
            ok: false,
            message: err instanceof Error ? err.message : 'Faucet request failed',
          }
          setResults((prev) => {
            const next = [...prev, errResult]
            localStorage.setItem(LS_RESULTS, JSON.stringify(next))
            return next
          })
          return
        }

        setAccounts((prev) =>
          prev.map((a) => {
            const f = funded.find((x) => x.role === a.role)
            return f ? { ...a, address: f.address, xrpBalance: f.balance } : a
          }),
        )

        const result: TxResult = {
          stepId: step.id,
          hash: 'N/A',
          ts: Date.now(),
          ok: true,
          message: 'FaucetFund confirmed (4 wallets funded)',
        }
        setResults((prev) => {
          const next = [...prev, result]
          localStorage.setItem(LS_RESULTS, JSON.stringify(next))
          return next
        })
        setCompleted((prev) => {
          const next = new Set(prev).add(step.id)
          localStorage.setItem(LS_COMPLETED, JSON.stringify([...next]))
          return next
        })
        return
      }

      // Mock behavior for steps not yet wired to XRPL (slices 3+).
      setAccounts((prev) =>
        prev.map((a) => {
          const granted = step.grants[a.role]
          const next = { ...a }
          if (granted) {
            next.badges = Array.from(new Set([...a.badges, ...granted])) as Badge[]
          }
          if (step.id === 'p1-payment') {
            if (a.role === 'traderB') next.eurfBalance = 1000
            if (a.role === 'issuer') next.eurfBalance = -1000
          }
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
        : ('PROTO' + Math.random().toString(16).slice(2, 10).toUpperCase()).padEnd(16, '0')

      const result: TxResult = {
        stepId: step.id,
        hash,
        ts: Date.now(),
        ok: true,
        message: isHttp
          ? `${step.txType} confirmed (off-ledger)`
          : `${step.txType} validated`,
      }
      setResults((prev) => {
        const next = [...prev, result]
        localStorage.setItem(LS_RESULTS, JSON.stringify(next))
        return next
      })
      setCompleted((prev) => {
        const next = new Set(prev).add(step.id)
        localStorage.setItem(LS_COMPLETED, JSON.stringify([...next]))
        return next
      })
    },
    [completed],
  )

  const reset = useCallback(() => {
    walletStore = new Map()
    setAccounts(INITIAL_ACCOUNTS)
    setCompleted(new Set())
    setResults([])
    localStorage.removeItem(LS_COMPLETED)
    localStorage.removeItem(LS_RESULTS)
  }, [])

  const accountByRole = useMemo(() => {
    const m = new Map<AccountRole, Account>()
    for (const a of accounts) m.set(a.role, a)
    return m
  }, [accounts])

  return { accounts, accountByRole, completed, results, runStep, reset }
}
