// PROTOTYPE — Variant B: "Ledger Timeline"
// Layout: vertical scrolling timeline of transactions is the primary surface;
// account state lives in a slim left rail. Results expand inline in the row.

import { useMemo } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  Coins,
  Network,
  Play,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import {
  BADGE_LABELS,
  NETWORK_URL,
  PHASE_LABELS,
  PHASE_ORDER,
  STEPS,
  useMockDemo,
} from './mockState'
import type { Account, Badge, Phase } from './types'

const ROLE_ICON: Record<Account['role'], typeof Wallet> = {
  issuer: Coins,
  domainOwner: Network,
  traderA: Wallet,
  traderB: Wallet,
}

// Static class maps so Tailwind's content scanner can see every utility used.
const ROLE_CHIP: Record<Account['role'], string> = {
  issuer: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  domainOwner: 'bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/30',
  traderA: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
  traderB: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
}

const ROLE_AVATAR: Record<Account['role'], string> = {
  issuer: 'bg-amber-500/15 ring-amber-500/40 text-amber-300',
  domainOwner: 'bg-fuchsia-500/15 ring-fuchsia-500/40 text-fuchsia-300',
  traderA: 'bg-sky-500/15 ring-sky-500/40 text-sky-300',
  traderB: 'bg-emerald-500/15 ring-emerald-500/40 text-emerald-300',
}

function AccountRail({ accounts }: { accounts: Account[] }) {
  return (
    <aside className="w-60 shrink-0 border-r border-slate-800 px-4 py-5 sticky top-0 h-screen overflow-auto">
      <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-3">
        Accounts
      </div>
      <ul className="flex flex-col gap-3">
        {accounts.map((a) => {
          const Icon = ROLE_ICON[a.role]
          return (
            <li
              key={a.role}
              className="rounded-lg bg-slate-900/40 ring-1 ring-slate-800 p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-7 h-7 rounded-md ring-1 flex items-center justify-center ${ROLE_AVATAR[a.role]}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">
                    {a.label}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 truncate">
                    {a.address.slice(0, 10)}…
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                <span className="text-slate-500">XRP</span>
                <span className="text-slate-200">{a.xrpBalance}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono mb-2">
                <span className="text-slate-500">EURF</span>
                <span className="text-slate-200">{a.eurfBalance}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {a.badges.length === 0 && (
                  <span className="text-[10px] text-slate-600 italic">—</span>
                )}
                {a.badges.map((b: Badge) => (
                  <span
                    key={b}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                  >
                    {BADGE_LABELS[b]}
                  </span>
                ))}
              </div>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}

export function VariantB() {
  const { accounts, accountByRole, completed, results, runStep, reset } = useMockDemo()
  const resultByStep = useMemo(() => {
    const m = new Map<string, (typeof results)[number]>()
    for (const r of results) m.set(r.stepId, r)
    return m
  }, [results])

  const nextStep = STEPS.find((s) => !completed.has(s.id))

  return (
    <div className="min-h-screen flex">
      <AccountRail accounts={accounts} />

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-10 px-6 py-3 bg-slate-950/90 backdrop-blur border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <div className="text-sm font-semibold text-white">PDex Ledger</div>
            <span className="text-xs text-slate-500">·</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-800 font-mono text-[11px] text-slate-300">
              {NETWORK_URL}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {nextStep && (
              <button
                onClick={() => runStep(nextStep)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold"
              >
                <Play className="w-3.5 h-3.5" />
                Run next: {nextStep.txType}
              </button>
            )}
            <button
              onClick={reset}
              className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
            >
              Reset
            </button>
          </div>
        </header>

        <main className="px-6 py-6 max-w-3xl">
          {PHASE_ORDER.map((p: Phase, pi) => {
            const phaseSteps = STEPS.filter((s) => s.phase === p)
            return (
              <section key={p} className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 rounded-full bg-slate-800 ring-1 ring-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                    {pi + 1}
                  </div>
                  <h2 className="text-sm uppercase tracking-wider text-slate-400">
                    Phase {pi + 1} — {PHASE_LABELS[p]}
                  </h2>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>
                <ol className="relative ml-3 border-l-2 border-slate-800">
                  {phaseSteps.map((step) => {
                    const done = completed.has(step.id)
                    const result = resultByStep.get(step.id)
                    const actor = accountByRole.get(step.actor)!
                    const Icon = ROLE_ICON[step.actor]
                    return (
                      <li key={step.id} className="relative pl-6 pb-3">
                        <span
                          className={`absolute -left-[9px] top-3 w-4 h-4 rounded-full ring-2 ring-slate-950 ${
                            done ? 'bg-emerald-400' : 'bg-slate-700'
                          }`}
                        />
                        <div
                          className={`rounded-lg p-3 ring-1 ${
                            done
                              ? 'bg-slate-900/60 ring-slate-800'
                              : 'bg-slate-900/30 ring-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] ring-1 ${ROLE_CHIP[step.actor]}`}
                            >
                              <Icon className="w-3 h-3" />
                              {actor.label}
                            </span>
                            <span className="text-slate-500 text-xs">→</span>
                            <span className="font-mono text-[11px] text-indigo-300">
                              {step.txType}
                            </span>
                            <span className="text-sm text-white">{step.title}</span>
                            <button
                              disabled={done}
                              onClick={() => runStep(step)}
                              className={`ml-auto text-[11px] px-2 py-1 rounded-md ${
                                done
                                  ? 'bg-slate-800 text-slate-500'
                                  : 'bg-indigo-500 hover:bg-indigo-400 text-white'
                              }`}
                            >
                              {done ? 'Done' : 'Run'}
                            </button>
                          </div>
                          {done && result && (
                            <div className="mt-2 pl-1 flex items-start gap-2 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5" />
                              <div>
                                <div className="text-slate-400">{result.message}</div>
                                <div className="font-mono text-slate-500">
                                  hash: {result.hash}
                                </div>
                              </div>
                            </div>
                          )}
                          {!done && (
                            <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
                              <Circle className="w-3 h-3" />
                              <span>{step.description}</span>
                            </div>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </section>
            )
          })}
          {!nextStep && (
            <div className="rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30 p-4 flex items-center gap-3">
              <ChevronDown className="w-5 h-5 text-emerald-300 rotate-[-90deg]" />
              <div>
                <div className="text-emerald-200 font-semibold">Demo complete.</div>
                <div className="text-xs text-emerald-300/80">
                  Offers crossed inside the Permissioned Domain.
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
