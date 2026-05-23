import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  BadgeCheck,
  Banknote,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Cloud,
  Code2,
  Coins,
  Copy,
  Eye,
  Info,
  KeyRound,
  Loader2,
  Network,
  Send,
  ShieldCheck,
  Sparkles,
  Wallet,
  Workflow,
} from 'lucide-react'
import { buildTx } from './buildTx'
import type { BuildTxContext } from './buildTx'
import { FlowDiagram } from './FlowDiagram'
import {
  BADGE_LABELS,
  NETWORK_URL,
  PHASE_LABELS,
  PHASE_ORDER,
  STEPS,
} from './mockState'
import type { Account, Badge, DemoStep, Phase } from './types'
import { useDemoState } from './useDemoState'

const ROLE_ICON: Record<Account['role'], typeof Wallet> = {
  issuer: Coins,
  domainOwner: Network,
  traderA: Wallet,
  traderB: Wallet,
}

// Account identity — one colour per account. Used sparingly: avatar tile on the
// card + actor chip on tx rows. Not on whole-card backgrounds (would drown).
const ROLE_AVATAR: Record<Account['role'], string> = {
  issuer: 'bg-amber-500/15 ring-amber-500/40 text-amber-300',
  domainOwner: 'bg-fuchsia-500/15 ring-fuchsia-500/40 text-fuchsia-300',
  traderA: 'bg-sky-500/15 ring-sky-500/40 text-sky-300',
  traderB: 'bg-emerald-500/15 ring-emerald-500/40 text-emerald-300',
}

const ROLE_CHIP: Record<Account['role'], string> = {
  issuer: 'bg-amber-500/10 text-amber-300 ring-amber-500/30',
  domainOwner: 'bg-fuchsia-500/10 text-fuchsia-300 ring-fuchsia-500/30',
  traderA: 'bg-sky-500/10 text-sky-300 ring-sky-500/30',
  traderB: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
}

// Phase identity — one colour per phase. Chosen deliberately distinct from the
// four account colours, and from each other. Used on phase tabs + the badges
// accumulated on account cards (each badge inherits its earning phase).
const PHASE_BADGE: Record<Phase, string> = {
  setup: 'bg-slate-500/15 text-slate-200 ring-slate-400/40',
  credentials: 'bg-indigo-500/15 text-indigo-200 ring-indigo-400/40',
  domain: 'bg-violet-500/15 text-violet-200 ring-violet-400/40',
  trading: 'bg-orange-500/15 text-orange-200 ring-orange-400/40',
  redemption: 'bg-rose-500/15 text-rose-200 ring-rose-400/40',
}

const PHASE_TAB_ACTIVE: Record<Phase, string> = {
  setup: 'border-slate-300 text-white',
  credentials: 'border-indigo-400 text-white',
  domain: 'border-violet-400 text-white',
  trading: 'border-orange-400 text-white',
  redemption: 'border-rose-400 text-white',
}

const PHASE_NUM_ACTIVE: Record<Phase, string> = {
  setup: 'bg-slate-500/30 text-slate-100',
  credentials: 'bg-indigo-500/30 text-indigo-100',
  domain: 'bg-violet-500/30 text-violet-100',
  trading: 'bg-orange-500/30 text-orange-100',
  redemption: 'bg-rose-500/30 text-rose-100',
}

const BADGE_ICON: Record<Badge, typeof BadgeCheck> = {
  TrustLine: BadgeCheck,
  IOUFunded: Coins,
  KYC: ShieldCheck,
  DomainActive: Network,
  TradeExecuted: Sparkles,
  Settled: Banknote,
}

// Each badge is "earned" in a particular phase, so its pill carries that phase's
// colour. Scanning an account card tells you which phases that account has
// participated in, at a glance.
const BADGE_PHASE: Record<Badge, Phase> = {
  TrustLine: 'setup',
  IOUFunded: 'setup',
  KYC: 'credentials',
  DomainActive: 'domain',
  TradeExecuted: 'trading',
  Settled: 'redemption',
}

// Minimal JSON syntax highlighter — keys, strings, numbers, literals, punct.
// Lives inside a dark code block so its palette doesn't compete with the
// surrounding account/phase colours (code-context is read separately by the eye).
function highlightJson(value: unknown): ReactNode {
  const text = JSON.stringify(value, null, 2)
  const out: ReactNode[] = []
  let lastIdx = 0
  let key = 0
  const re =
    /("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)|([{}\[\],])/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIdx) {
      out.push(
        <span key={key++} className="text-slate-500">
          {text.slice(lastIdx, m.index)}
        </span>,
      )
    }
    if (m[1] && m[2]) {
      out.push(
        <span key={key++} className="text-sky-300">
          {m[1]}
        </span>,
      )
      out.push(
        <span key={key++} className="text-slate-500">
          {m[2]}
        </span>,
      )
    } else if (m[1]) {
      out.push(
        <span key={key++} className="text-emerald-300">
          {m[1]}
        </span>,
      )
    } else if (m[3]) {
      out.push(
        <span key={key++} className="text-violet-300">
          {m[3]}
        </span>,
      )
    } else if (m[4]) {
      out.push(
        <span key={key++} className="text-amber-200">
          {m[4]}
        </span>,
      )
    } else if (m[5]) {
      out.push(
        <span key={key++} className="text-slate-500">
          {m[5]}
        </span>,
      )
    }
    lastIdx = m.index + m[0].length
  }
  if (lastIdx < text.length) {
    out.push(
      <span key={key++} className="text-slate-400">
        {text.slice(lastIdx)}
      </span>,
    )
  }
  return out
}

interface InspectorProps {
  step: DemoStep
  json: Record<string, unknown>
  done: boolean
  resultHash: string | undefined
  onSubmit: () => void
  onClose: () => void
}

const HTTP_STEP_HEADER: Record<string, string> = {
  'p1-faucet': 'Testnet faucet · POST to faucet.altnet.rippletest.net',
  'p1-sepa': 'Off-ledger SEPA transfer · POST to bank API',
  'p5-redeem': 'Fiat redemption · POST to issuer redemption API',
}

function TxInspector({
  step,
  json,
  done,
  resultHash,
  onSubmit,
  onClose,
}: InspectorProps) {
  const isHttp = step.kind === 'http'
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard?.writeText(JSON.stringify(json, null, 2))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  const headerText = isHttp
    ? (HTTP_STEP_HEADER[step.id] ?? 'Off-ledger API request')
    : `${String(json.TransactionType)} · signed and submitted to XRPL`

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="overflow-hidden border-t border-slate-700/80"
    >
      <div className="px-4 pt-3 pb-4 bg-slate-950/60">
        <div className="flex items-center gap-2 mb-2">
          {isHttp ? (
            <Cloud className="w-3.5 h-3.5 text-rose-300" />
          ) : (
            <Code2 className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span className="text-[11px] uppercase tracking-wider text-slate-400">
            {headerText}
          </span>
          <button
            onClick={handleCopy}
            className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-slate-300 bg-slate-800 hover:bg-slate-700 ring-1 ring-slate-700"
            aria-label="Copy JSON"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy JSON
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-2 py-0.5 rounded-md text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <pre className="font-mono text-[12.5px] leading-relaxed rounded-lg bg-slate-900/80 ring-1 ring-slate-800 px-3 py-2.5 overflow-x-auto whitespace-pre">
          {highlightJson(json)}
        </pre>

        <div className="flex items-center gap-2 mt-3">
          {done ? (
            <div className="flex items-center gap-2 text-[12px]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-300">
                {isHttp ? 'Request sent.' : 'Already submitted.'}
              </span>
              {resultHash && (
                <span className="font-mono text-slate-400">
                  {isHttp ? `receipt ${resultHash}` : resultHash}
                </span>
              )}
            </div>
          ) : isHttp ? (
            <>
              <button
                onClick={() => { onSubmit(); onClose() }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold shadow"
              >
                <Send className="w-4 h-4" />
                Send Request
              </button>
              <span className="text-[11px] text-slate-500">
                mock endpoint · no network call in prototype
              </span>
            </>
          ) : (
            <>
              <button
                onClick={() => { onSubmit(); onClose() }}
                className="px-4 py-2 rounded-md bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold shadow"
              >
                Execute
              </button>
              <button
                onClick={() => { onSubmit(); onClose() }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold shadow ring-1 ring-slate-600"
              >
                <Send className="w-4 h-4" />
                Sign & Submit
              </button>
              <span className="text-[11px] text-slate-500">fee 12 drops · testnet</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function AccountCard({ account }: { account: Account }) {
  const Icon = ROLE_ICON[account.role]
  return (
    <div className="flex-1 rounded-2xl bg-slate-800/60 ring-1 ring-slate-700 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div
          className={`w-9 h-9 rounded-xl ring-1 flex items-center justify-center ${ROLE_AVATAR[account.role]}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">
            {account.label}
          </div>
          <div className="text-[11px] font-mono text-slate-400 truncate">
            {account.address.slice(0, 12)}…
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg bg-slate-900/60 px-2 py-1">
          <div className="text-slate-500">XRP</div>
          <div className="font-mono text-slate-200">{account.xrpBalance}</div>
        </div>
        <div className="rounded-lg bg-slate-900/60 px-2 py-1">
          <div className="text-slate-500">EURF</div>
          <div className="font-mono text-slate-200">{account.eurfBalance}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {account.badges.length === 0 && (
          <span className="text-[11px] text-slate-500 italic">no permissions yet</span>
        )}
        {account.badges.map((b) => {
          const BIcon = BADGE_ICON[b]
          return (
            <span
              key={b}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ring-1 ${PHASE_BADGE[BADGE_PHASE[b]]}`}
            >
              <BIcon className="w-3 h-3" />
              {BADGE_LABELS[b]}
            </span>
          )
        })}
      </div>
    </div>
  )
}

type TabKey = 'flow' | Phase

export function Dashboard() {
  const { accounts, accountByRole, completed, results, runStep, reset } = useDemoState()
  // Default to the flow diagram — that's how the demo opens (high-level
  // explainer first, then drill into the phase tabs to execute transactions).
  const [activeTab, setActiveTab] = useState<TabKey>('flow')
  const [inspectingId, setInspectingId] = useState<string | null>(null)
  const [runningId, setRunningId] = useState<string | null>(null)

  const handleRunStep = useCallback(
    (step: DemoStep) => {
      setRunningId(step.id)
      runStep(step).finally(() => setRunningId(null))
    },
    [runStep],
  )

  const phaseSteps = useMemo(
    () =>
      activeTab === 'flow' ? [] : STEPS.filter((s) => s.phase === activeTab),
    [activeTab],
  )
  const resultByStep = useMemo(() => {
    const m = new Map<string, string>()
    for (const r of results) m.set(r.stepId, r.hash)
    return m
  }, [results])

  const domainId = useMemo(
    () => results.find((r) => r.stepId === 'p3-domain')?.domainId,
    [results],
  )

  const buildTxContext = useMemo<BuildTxContext>(
    () => ({ accountByRole, domainId, burnTxHash: resultByStep.get('p5-burn') }),
    [accountByRole, domainId, resultByStep],
  )

  // Clicking an edge in the diagram jumps to that step's phase tab and pre-opens
  // the JSON inspector so the viewer immediately sees the transaction shape.
  const handleSelectStep = (stepId: string) => {
    const step = STEPS.find((s) => s.id === stepId)
    if (!step) return
    setActiveTab(step.phase)
    setInspectingId(stepId)
  }

  const handleReset = () => {
    reset()
    setInspectingId(null)
    setActiveTab('flow')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-indigo-400" />
          <div>
            <div className="text-lg font-bold text-white">PDex Demo</div>
            <div className="text-xs text-slate-400">Permission Dashboard</div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="px-2 py-1 rounded-md bg-slate-800 font-mono text-slate-300">
            {NETWORK_URL}
          </span>
          <button
            onClick={handleReset}
            className="px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Demo simplification disclaimer (ADR 0001) */}
      <div className="px-6 py-2 bg-amber-500/8 border-b border-amber-500/20 flex items-center gap-2">
        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <p className="text-[11px] text-amber-200/80">
          <span className="font-semibold text-amber-300">Demo simplification:</span>{' '}
          The Issuer account doubles as both the XRPL credential issuer and the EURF IOU issuer.
          In production these would be separate entities.
        </p>
      </div>

      <section className="px-6 pt-5">
        <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">
          Accounts
        </div>
        <div className="flex gap-3">
          {accounts.map((a) => (
            <AccountCard key={a.role} account={a} />
          ))}
        </div>
      </section>

      <nav className="px-6 mt-6 flex gap-1 border-b border-slate-800">
        <button
          onClick={() => {
            setActiveTab('flow')
            setInspectingId(null)
          }}
          className={`px-4 py-3 -mb-px border-b-2 text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'flow'
              ? 'border-indigo-400 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Workflow className="w-4 h-4" />
          Flow
        </button>
        <div className="self-center w-px h-5 bg-slate-800 mx-1" />
        {PHASE_ORDER.map((p, i) => {
          const stepsInPhase = STEPS.filter((s) => s.phase === p)
          const doneInPhase = stepsInPhase.filter((s) => completed.has(s.id)).length
          const total = stepsInPhase.length
          const isActive = p === activeTab
          const allDone = doneInPhase === total
          return (
            <button
              key={p}
              onClick={() => setActiveTab(p)}
              className={`px-4 py-3 -mb-px border-b-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                isActive
                  ? PHASE_TAB_ACTIVE[p]
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${
                  isActive
                    ? PHASE_NUM_ACTIVE[p]
                    : allDone
                      ? 'bg-emerald-500/25 text-emerald-200'
                      : 'bg-slate-800 text-slate-400'
                }`}
              >
                {i + 1}
              </span>
              {PHASE_LABELS[p]}
              <span className="text-[11px] text-slate-500">
                {doneInPhase}/{total}
              </span>
            </button>
          )
        })}
      </nav>

      {activeTab === 'flow' ? (
        <main className="flex-1 px-6 py-5">
          <FlowDiagram
            completed={completed}
            onSelectStep={handleSelectStep}
          />
        </main>
      ) : (
      <main className="flex-1 px-6 py-5 grid grid-cols-3 gap-5">
        <div className="col-span-2 flex flex-col gap-3">
          {phaseSteps.map((step) => {
            const done = completed.has(step.id)
            const isRunning = runningId === step.id
            const actor = accountByRole.get(step.actor)!
            const Icon = ROLE_ICON[step.actor]
            const isInspecting = inspectingId === step.id
            const json = buildTx(step, buildTxContext)
            const stepResult = results.find((r) => r.stepId === step.id)
            return (
              <div
                key={step.id}
                className={`rounded-xl ring-1 overflow-hidden ${
                  done
                    ? 'bg-emerald-500/5 ring-emerald-500/30'
                    : isInspecting
                      ? 'bg-slate-800/60 ring-slate-600'
                      : 'bg-slate-800/40 ring-slate-700'
                }`}
              >
                <div className="p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center ring-1 ring-slate-700">
                    {isRunning ? (
                      <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                    ) : done ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] ring-1 ${ROLE_CHIP[step.actor]}`}
                      >
                        <Icon className="w-3 h-3" />
                        {actor.label}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {step.txType}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {step.title}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {step.description}
                    </div>
                    {stepResult && (
                      <div className="mt-1.5 text-[11px]">
                        <div
                          className={`flex items-center gap-1 ${
                            stepResult.ok ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {stepResult.ok ? (
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3 h-3 shrink-0" />
                          )}
                          {stepResult.message}
                        </div>
                        {step.kind !== 'http' && stepResult.hash !== 'N/A' && (
                          <div className="font-mono text-slate-400 mt-0.5 pl-4">
                            {stepResult.hash.slice(0, 16)}…
                            {stepResult.closeTime && (
                              <span className="ml-2 non-italic text-slate-500">
                                {new Date(stepResult.closeTime).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                        )}
                        {stepResult.domainId && (
                          <div className="font-mono text-cyan-400/80 mt-0.5 pl-4">
                            DomainID: {stepResult.domainId.slice(0, 16)}…
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        setInspectingId(isInspecting ? null : step.id)
                      }
                      className={`inline-flex items-center gap-1 px-2 py-1.5 text-[11px] rounded-md ring-1 transition-colors ${
                        isInspecting
                          ? 'bg-slate-700 text-white ring-slate-500'
                          : 'bg-slate-900/60 text-slate-300 ring-slate-700 hover:bg-slate-800 hover:text-white'
                      }`}
                      title="Preview transaction JSON before signing"
                      aria-expanded={isInspecting}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${isInspecting ? 'rotate-180' : ''}`}
                      />
                    </button>
                    <button
                      disabled={done || isRunning}
                      onClick={() => handleRunStep(step)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md ${
                        done || isRunning
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-indigo-500 hover:bg-indigo-400 text-white'
                      }`}
                    >
                      {done ? 'Done' : isRunning ? 'Running…' : 'Execute'}
                    </button>
                  </div>
                </div>
                <AnimatePresence initial={false}>
                  {isInspecting && (
                    <TxInspector
                      key="inspector"
                      step={step}
                      json={json}
                      done={done}
                      resultHash={resultByStep.get(step.id)}
                      onSubmit={() => handleRunStep(step)}
                      onClose={() => setInspectingId(null)}
                    />
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>

        <aside className="rounded-xl bg-slate-800/40 ring-1 ring-slate-700 p-4 self-start sticky top-4">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound className="w-4 h-4 text-slate-400" />
            <div className="text-sm font-semibold text-white">Tx Results</div>
            <span className="ml-auto text-[11px] text-slate-500">
              {results.length} total
            </span>
          </div>
          {results.length === 0 && (
            <div className="text-xs text-slate-500 italic">No transactions yet.</div>
          )}
          <ul className="flex flex-col gap-2 max-h-[60vh] overflow-auto">
            {results
              .slice()
              .reverse()
              .map((r) => (
                <li
                  key={r.hash}
                  className="rounded-md bg-slate-900/60 px-2 py-1.5 ring-1 ring-slate-800"
                >
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span className="font-mono text-slate-300 truncate">{r.hash}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{r.message}</div>
                </li>
              ))}
          </ul>
        </aside>
      </main>
      )}
    </div>
  )
}
