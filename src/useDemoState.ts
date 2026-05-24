import { useCallback, useMemo, useState } from 'react'
import type { Wallet } from 'xrpl'
import { buildTx } from './buildTx'
import type { BuildTxContext } from './buildTx'
import { INITIAL_ACCOUNTS } from './mockState'
import { xrplClient } from './xrplClient'
import type { Account, AccountRole, Badge, DemoStep, TxResult } from './types'

const LS_COMPLETED = 'pdex-completed'
const LS_RESULTS = 'pdex-results'

// Wallets and domain ID in module-level state — survive re-renders, not a page refresh.
let walletStore: Map<AccountRole, Wallet> = new Map()
let domainIdStore: string | undefined = undefined
let burnTxHashStore: string | undefined = undefined

function buildContextFromStore(): BuildTxContext {
  const m = new Map<AccountRole, Account>()
  for (const acc of INITIAL_ACCOUNTS) {
    const w = walletStore.get(acc.role)
    m.set(acc.role, w ? { ...acc, address: w.classicAddress } : acc)
  }
  return { accountByRole: m, domainId: domainIdStore, burnTxHash: burnTxHashStore }
}

function extractDomainId(meta: Record<string, unknown>): string | undefined {
  const nodes = meta.AffectedNodes as unknown[]
  if (!Array.isArray(nodes)) return undefined
  for (const node of nodes) {
    const n = node as Record<string, unknown>
    const created = n.CreatedNode as Record<string, unknown> | undefined
    if (created?.LedgerEntryType === 'PermissionedDomain') {
      return typeof created.LedgerIndex === 'string' ? created.LedgerIndex : undefined
    }
  }
  return undefined
}

const RIPPLE_EPOCH = 946684800

async function submitXrpl(
  tx: Record<string, unknown>,
  wallet: Wallet,
): Promise<{ hash: string; closeTime: string; ok: boolean; errorCode: string; meta: Record<string, unknown> }> {
  if (!xrplClient.isConnected()) await xrplClient.connect()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (xrplClient as any).submitAndWait(tx, { autofill: true, wallet })
  const res = response.result as Record<string, unknown>
  const hash = typeof res.hash === 'string' ? res.hash : 'N/A'
  const dateVal = typeof res.date === 'number' ? res.date : 0
  const closeTime = new Date((dateVal + RIPPLE_EPOCH) * 1000).toISOString()
  const meta = (res.meta as Record<string, unknown>) ?? {}
  const errorCode =
    typeof meta.TransactionResult === 'string' ? meta.TransactionResult : 'unknown'
  return { hash, closeTime, ok: errorCode === 'tesSUCCESS', errorCode, meta }
}

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
          const faucetOpts = {
            faucetHost: window.location.host,
            faucetPath: '/api/faucet',
            faucetProtocol: window.location.protocol.slice(0, -1) as 'http' | 'https',
          }
          const results = await Promise.all(roles.map((role) => xrplClient.fundWallet(null, faucetOpts).then(({ wallet, balance }) => ({ role, wallet, balance }))))
          for (const { role, wallet, balance } of results) {
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

      if (
        step.id === 'p1-trustset-a' ||
        step.id === 'p1-trustset-b' ||
        step.id === 'p1-payment'
      ) {
        const actorRole =
          step.id === 'p1-payment'
            ? 'issuer'
            : step.id === 'p1-trustset-a'
              ? 'traderA'
              : 'traderB'
        const wallet = walletStore.get(actorRole)
        if (!wallet) {
          setResults((prev) => {
            const next = [
              ...prev,
              {
                stepId: step.id,
                hash: 'N/A',
                ts: Date.now(),
                ok: false,
                message: 'Run faucet first to fund wallets',
              },
            ]
            localStorage.setItem(LS_RESULTS, JSON.stringify(next))
            return next
          })
          return
        }
        try {
          const tx = buildTx(step, buildContextFromStore())
          const { hash, closeTime, ok, errorCode } = await submitXrpl(tx, wallet)
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
              return next
            }),
          )
          const result: TxResult = {
            stepId: step.id,
            hash,
            closeTime,
            ts: Date.now(),
            ok,
            message: ok
              ? `${step.txType} validated`
              : `${step.txType} failed: ${errorCode}`,
          }
          setResults((prev) => {
            const next = [...prev, result]
            localStorage.setItem(LS_RESULTS, JSON.stringify(next))
            return next
          })
          if (ok) {
            setCompleted((prev) => {
              const next = new Set(prev).add(step.id)
              localStorage.setItem(LS_COMPLETED, JSON.stringify([...next]))
              return next
            })
          }
        } catch (err) {
          setResults((prev) => {
            const next = [
              ...prev,
              {
                stepId: step.id,
                hash: 'N/A',
                ts: Date.now(),
                ok: false,
                message: err instanceof Error ? err.message : `${step.txType} failed`,
              },
            ]
            localStorage.setItem(LS_RESULTS, JSON.stringify(next))
            return next
          })
        }
        return
      }

      if (
        step.id === 'p2-credcreate-a' ||
        step.id === 'p2-credcreate-b' ||
        step.id === 'p2-accept-a' ||
        step.id === 'p2-accept-b'
      ) {
        const wallet = walletStore.get(step.actor)
        if (!wallet) {
          setResults((prev) => {
            const next = [
              ...prev,
              {
                stepId: step.id,
                hash: 'N/A',
                ts: Date.now(),
                ok: false,
                message: 'Run faucet first to fund wallets',
              },
            ]
            localStorage.setItem(LS_RESULTS, JSON.stringify(next))
            return next
          })
          return
        }
        try {
          const tx = buildTx(step, buildContextFromStore())
          const { hash, closeTime, ok, errorCode } = await submitXrpl(tx, wallet)
          setAccounts((prev) =>
            prev.map((a) => {
              const granted = step.grants[a.role]
              if (!granted) return a
              return { ...a, badges: Array.from(new Set([...a.badges, ...granted])) as Badge[] }
            }),
          )
          const result: TxResult = {
            stepId: step.id,
            hash,
            closeTime,
            ts: Date.now(),
            ok,
            message: ok
              ? `${step.txType} validated`
              : `${step.txType} failed: ${errorCode}`,
          }
          setResults((prev) => {
            const next = [...prev, result]
            localStorage.setItem(LS_RESULTS, JSON.stringify(next))
            return next
          })
          if (ok) {
            setCompleted((prev) => {
              const next = new Set(prev).add(step.id)
              localStorage.setItem(LS_COMPLETED, JSON.stringify([...next]))
              return next
            })
          }
        } catch (err) {
          setResults((prev) => {
            const next = [
              ...prev,
              {
                stepId: step.id,
                hash: 'N/A',
                ts: Date.now(),
                ok: false,
                message: err instanceof Error ? err.message : `${step.txType} failed`,
              },
            ]
            localStorage.setItem(LS_RESULTS, JSON.stringify(next))
            return next
          })
        }
        return
      }

      if (
        step.id === 'p4-offer-a' ||
        step.id === 'p4-offer-b' ||
        step.id === 'p4-open-offer'
      ) {
        const actorRole = step.id === 'p4-offer-a' ? 'traderA' : 'traderB'
        const wallet = walletStore.get(actorRole)
        if (!wallet) {
          setResults((prev) => {
            const next = [
              ...prev,
              {
                stepId: step.id,
                hash: 'N/A',
                ts: Date.now(),
                ok: false,
                message: 'Run faucet first to fund wallets',
              },
            ]
            localStorage.setItem(LS_RESULTS, JSON.stringify(next))
            return next
          })
          return
        }
        try {
          const tx = buildTx(step, buildContextFromStore())
          const { hash, closeTime, ok, errorCode } = await submitXrpl(tx, wallet)
          if (ok) {
            setAccounts((prev) =>
              prev.map((a) => {
                const granted = step.grants[a.role]
                const next = { ...a }
                if (granted) {
                  next.badges = Array.from(new Set([...a.badges, ...granted])) as Badge[]
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
                return next
              }),
            )
          }
          const result: TxResult = {
            stepId: step.id,
            hash,
            closeTime,
            ts: Date.now(),
            ok,
            message: ok
              ? `${step.txType} validated`
              : `${step.txType} failed: ${errorCode}`,
          }
          setResults((prev) => {
            const next = [...prev, result]
            localStorage.setItem(LS_RESULTS, JSON.stringify(next))
            return next
          })
          if (ok) {
            setCompleted((prev) => {
              const next = new Set(prev).add(step.id)
              localStorage.setItem(LS_COMPLETED, JSON.stringify([...next]))
              return next
            })
          }
        } catch (err) {
          setResults((prev) => {
            const next = [
              ...prev,
              {
                stepId: step.id,
                hash: 'N/A',
                ts: Date.now(),
                ok: false,
                message: err instanceof Error ? err.message : `${step.txType} failed`,
              },
            ]
            localStorage.setItem(LS_RESULTS, JSON.stringify(next))
            return next
          })
        }
        return
      }

      if (step.id === 'p3-domain') {
        const wallet = walletStore.get('domainOwner')
        if (!wallet) {
          setResults((prev) => {
            const next = [
              ...prev,
              {
                stepId: step.id,
                hash: 'N/A',
                ts: Date.now(),
                ok: false,
                message: 'Run faucet first to fund wallets',
              },
            ]
            localStorage.setItem(LS_RESULTS, JSON.stringify(next))
            return next
          })
          return
        }
        try {
          const tx = buildTx(step, buildContextFromStore())
          const { hash, closeTime, ok, errorCode, meta } = await submitXrpl(tx, wallet)
          const capturedDomainId = ok ? extractDomainId(meta) : undefined
          if (capturedDomainId) domainIdStore = capturedDomainId
          setAccounts((prev) =>
            prev.map((a) => {
              const granted = step.grants[a.role]
              if (!granted) return a
              return { ...a, badges: Array.from(new Set([...a.badges, ...granted])) as Badge[] }
            }),
          )
          const result: TxResult = {
            stepId: step.id,
            hash,
            closeTime,
            ts: Date.now(),
            ok,
            message: ok
              ? `${step.txType} validated`
              : `${step.txType} failed: ${errorCode}`,
            domainId: capturedDomainId,
          }
          setResults((prev) => {
            const next = [...prev, result]
            localStorage.setItem(LS_RESULTS, JSON.stringify(next))
            return next
          })
          if (ok) {
            setCompleted((prev) => {
              const next = new Set(prev).add(step.id)
              localStorage.setItem(LS_COMPLETED, JSON.stringify([...next]))
              return next
            })
          }
        } catch (err) {
          setResults((prev) => {
            const next = [
              ...prev,
              {
                stepId: step.id,
                hash: 'N/A',
                ts: Date.now(),
                ok: false,
                message: err instanceof Error ? err.message : `${step.txType} failed`,
              },
            ]
            localStorage.setItem(LS_RESULTS, JSON.stringify(next))
            return next
          })
        }
        return
      }

      if (step.id === 'p5-burn') {
        const wallet = walletStore.get('traderA')
        if (!wallet) {
          setResults((prev) => {
            const next = [
              ...prev,
              {
                stepId: step.id,
                hash: 'N/A',
                ts: Date.now(),
                ok: false,
                message: 'Run faucet first to fund wallets',
              },
            ]
            localStorage.setItem(LS_RESULTS, JSON.stringify(next))
            return next
          })
          return
        }
        try {
          const tx = buildTx(step, buildContextFromStore())
          const { hash, closeTime, ok, errorCode } = await submitXrpl(tx, wallet)
          if (ok) {
            burnTxHashStore = hash
            setAccounts((prev) =>
              prev.map((a) => {
                const next = { ...a }
                if (a.role === 'traderA') next.eurfBalance = a.eurfBalance - 100
                if (a.role === 'issuer') next.eurfBalance = a.eurfBalance + 100
                return next
              }),
            )
          }
          const result: TxResult = {
            stepId: step.id,
            hash,
            closeTime,
            ts: Date.now(),
            ok,
            message: ok ? `${step.txType} validated` : `${step.txType} failed: ${errorCode}`,
          }
          setResults((prev) => {
            const next = [...prev, result]
            localStorage.setItem(LS_RESULTS, JSON.stringify(next))
            return next
          })
          if (ok) {
            setCompleted((prev) => {
              const next = new Set(prev).add(step.id)
              localStorage.setItem(LS_COMPLETED, JSON.stringify([...next]))
              return next
            })
          }
        } catch (err) {
          setResults((prev) => {
            const next = [
              ...prev,
              {
                stepId: step.id,
                hash: 'N/A',
                ts: Date.now(),
                ok: false,
                message: err instanceof Error ? err.message : `${step.txType} failed`,
              },
            ]
            localStorage.setItem(LS_RESULTS, JSON.stringify(next))
            return next
          })
        }
        return
      }

      // Mock behavior for remaining steps (SEPA and p5-redeem are off-ledger).
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
    domainIdStore = undefined
    burnTxHashStore = undefined
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
