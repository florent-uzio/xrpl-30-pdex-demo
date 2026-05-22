// PROTOTYPE — Variant C: "Stage Theater"
// Layout: one big spotlighted "current step" card with the acting account hero,
// other accounts as muted thumbnails, horizontal step strip at the bottom.
// Cinematic, one-action-at-a-time — optimised for screen-recording narration.

import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Coins,
  Network,
  Play,
  RotateCcw,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  BADGE_LABELS,
  NETWORK_URL,
  PHASE_LABELS,
  STEPS,
  useMockDemo,
} from './mockState'
import type { Account } from './types'

const ROLE_ICON: Record<Account['role'], typeof Wallet> = {
  issuer: Coins,
  domainOwner: Network,
  traderA: Wallet,
  traderB: Wallet,
}

const ROLE_HERO: Record<Account['role'], string> = {
  issuer: 'from-amber-500/40 to-amber-700/10 ring-amber-400/40',
  domainOwner: 'from-fuchsia-500/40 to-fuchsia-700/10 ring-fuchsia-400/40',
  traderA: 'from-sky-500/40 to-sky-700/10 ring-sky-400/40',
  traderB: 'from-emerald-500/40 to-emerald-700/10 ring-emerald-400/40',
}

export function VariantC() {
  const { accounts, accountByRole, completed, results, runStep, reset } = useMockDemo()
  const [idx, setIdx] = useState(0)
  const step = STEPS[idx]
  const done = completed.has(step.id)
  const result = useMemo(
    () => results.find((r) => r.stepId === step.id),
    [results, step.id],
  )
  const actor = accountByRole.get(step.actor)!
  const supporting = accounts.filter((a) => a.role !== step.actor)
  const ActorIcon = ROLE_ICON[step.actor]

  // After a step completes, auto-advance after a beat (feels cinematic).
  useEffect(() => {
    if (!done) return
    if (idx >= STEPS.length - 1) return
    const t = setTimeout(() => setIdx((i) => Math.min(i + 1, STEPS.length - 1)), 1200)
    return () => clearTimeout(t)
  }, [done, idx])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <div className="text-sm font-semibold text-white">PDex — Stage</div>
          <span className="text-xs text-slate-500">·</span>
          <span className="text-[11px] uppercase tracking-wider text-slate-400">
            {PHASE_LABELS[step.phase]} · Step {idx + 1}/{STEPS.length}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded-md bg-slate-800 font-mono text-slate-300">
            {NETWORK_URL}
          </span>
          <button
            onClick={() => {
              reset()
              setIdx(0)
            }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-[1fr_3fr_1fr] gap-4 p-6">
        <aside className="flex flex-col gap-3">
          {supporting.slice(0, 2).map((a) => (
            <SupportingCard key={a.role} account={a} />
          ))}
        </aside>

        <section className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className={`relative rounded-3xl bg-gradient-to-br ${ROLE_HERO[step.actor]} ring-2 p-8 h-full flex flex-col`}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-slate-950/60 ring-2 ring-white/10 flex items-center justify-center">
                  <ActorIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-white/70">
                    Acting account
                  </div>
                  <div className="text-2xl font-bold text-white">{actor.label}</div>
                  <div className="font-mono text-[11px] text-white/60">
                    {actor.address}
                  </div>
                </div>
              </div>

              <div className="text-[11px] uppercase tracking-wider text-white/60 mb-1">
                Transaction
              </div>
              <div className="text-3xl font-bold text-white mb-2">{step.txType}</div>
              <div className="text-lg text-white/90 mb-1">{step.title}</div>
              <div className="text-sm text-white/70 mb-6">{step.description}</div>

              {actor.badges.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {actor.badges.map((b) => (
                    <span
                      key={b}
                      className="text-[11px] px-2 py-1 rounded-full bg-white/15 text-white ring-1 ring-white/30"
                    >
                      {BADGE_LABELS[b]}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-auto flex items-center gap-3">
                <button
                  onClick={() => setIdx((i) => Math.max(0, i - 1))}
                  disabled={idx === 0}
                  className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30"
                  aria-label="Previous step"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                {!done ? (
                  <button
                    onClick={() => runStep(step)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white text-slate-900 font-bold text-lg hover:bg-slate-100 shadow-2xl"
                  >
                    <Play className="w-5 h-5" />
                    Execute {step.txType}
                  </button>
                ) : (
                  <div className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-emerald-400/95 text-emerald-950 font-bold text-lg shadow-2xl">
                    <CheckCircle2 className="w-5 h-5" />
                    Validated
                    {result && (
                      <span className="ml-2 font-mono text-xs opacity-80">
                        {result.hash}
                      </span>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setIdx((i) => Math.min(STEPS.length - 1, i + 1))}
                  disabled={idx === STEPS.length - 1}
                  className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30"
                  aria-label="Next step"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </section>

        <aside className="flex flex-col gap-3">
          {supporting.slice(2).map((a) => (
            <SupportingCard key={a.role} account={a} />
          ))}
        </aside>
      </div>

      <footer className="px-6 py-3 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {STEPS.map((s, i) => {
            const sDone = completed.has(s.id)
            const isCurrent = i === idx
            return (
              <button
                key={s.id}
                onClick={() => setIdx(i)}
                title={s.title}
                className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] ring-1 transition-colors ${
                  isCurrent
                    ? 'bg-white text-slate-900 ring-white'
                    : sDone
                      ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 ring-slate-700 hover:text-slate-200'
                }`}
              >
                <span className="font-mono opacity-70">{i + 1}</span>
                <span className="font-medium">{s.txType}</span>
              </button>
            )
          })}
        </div>
      </footer>
    </div>
  )
}

function SupportingCard({ account }: { account: Account }) {
  const Icon = ROLE_ICON[account.role]
  return (
    <div className="rounded-xl bg-slate-900/40 ring-1 ring-slate-800 p-3 opacity-70 hover:opacity-100 transition-opacity">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-md bg-slate-800 ring-1 ring-slate-700 flex items-center justify-center">
          <Icon className="w-4 h-4 text-slate-300" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-200 truncate">
            {account.label}
          </div>
          <div className="text-[10px] font-mono text-slate-500 truncate">
            {account.address.slice(0, 10)}…
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] font-mono mb-1">
        <span className="text-slate-500">XRP</span>
        <span className="text-slate-300">{account.xrpBalance}</span>
      </div>
      <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
        <span className="text-slate-500">EURF</span>
        <span className="text-slate-300">{account.eurfBalance}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {account.badges.length === 0 && (
          <span className="text-[10px] text-slate-600 italic">—</span>
        )}
        {account.badges.map((b) => (
          <span
            key={b}
            className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
          >
            {BADGE_LABELS[b]}
          </span>
        ))}
      </div>
    </div>
  )
}
