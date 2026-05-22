// PROTOTYPE — interactive flow diagram for the PDex demo.
// Horizontal narrative: Issuer + Domain Owner orchestrate; the credentialed
// traders sit inside a dashed Permissioned Domain box alongside the XRPL DEX;
// off-ledger settlement to a Bank node sits outside.
// Each step in STEPS becomes an edge with phase-coloured stroke. Hovering
// brings a tooltip; clicking jumps to the step's phase tab and opens the
// JSON inspector. Per-phase filter chips declutter when narrating one phase.

import { useMemo, useState, type MouseEvent } from 'react'
import {
  ArrowLeftRight,
  Check,
  Coins,
  Landmark,
  Maximize2,
  Minus,
  Network,
  Plus,
  Wallet,
  Workflow,
} from 'lucide-react'
import { PHASE_LABELS, PHASE_ORDER, STEPS } from './mockState'
import type { DemoStep, Phase } from './types'

// ---------- Layout constants ----------

const VIEWBOX_W = 1400
const VIEWBOX_H = 880

const ZOOM_LEVELS = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.15, 1.3, 1.5]
const DEFAULT_ZOOM_IDX = 2 // 0.7 — fits in most containers without scroll

type FlowNode =
  | 'issuer'
  | 'domainOwner'
  | 'traderA'
  | 'traderB'
  | 'xrplDex'
  | 'bank'

interface NodeSpec {
  x: number
  y: number
  r: number
  label: string
  sub?: string
  Icon: typeof Wallet
  ringClass: string
  bgClass: string
  iconClass: string
  // If true, render with a dashed outline (off-ledger).
  dashed?: boolean
}

const NODES: Record<FlowNode, NodeSpec> = {
  issuer: {
    x: 170,
    y: 420,
    r: 54,
    label: 'Issuer',
    sub: 'EURF · KYC',
    Icon: Coins,
    ringClass: 'stroke-amber-400',
    bgClass: 'fill-amber-500/20',
    iconClass: 'text-amber-200',
  },
  domainOwner: {
    x: 1180,
    y: 180,
    r: 54,
    label: 'Domain Owner',
    sub: 'creates the Permissioned Domain',
    Icon: Network,
    ringClass: 'stroke-fuchsia-400',
    bgClass: 'fill-fuchsia-500/20',
    iconClass: 'text-fuchsia-200',
  },
  traderA: {
    x: 560,
    y: 360,
    r: 52,
    label: 'Trader A',
    sub: 'sells XRP for EURF',
    Icon: Wallet,
    ringClass: 'stroke-sky-400',
    bgClass: 'fill-sky-500/20',
    iconClass: 'text-sky-200',
  },
  traderB: {
    x: 560,
    y: 640,
    r: 52,
    label: 'Trader B',
    sub: 'sells EURF for XRP',
    Icon: Wallet,
    ringClass: 'stroke-emerald-400',
    bgClass: 'fill-emerald-500/20',
    iconClass: 'text-emerald-200',
  },
  xrplDex: {
    x: 940,
    y: 500,
    r: 58,
    label: 'XRPL DEX',
    sub: 'Open order book + Permissioned orders',
    Icon: ArrowLeftRight,
    ringClass: 'stroke-indigo-400',
    bgClass: 'fill-indigo-500/20',
    iconClass: 'text-indigo-200',
  },
  bank: {
    x: 1280,
    y: 700,
    r: 46,
    label: 'Bank',
    sub: 'off-ledger FIAT rails',
    Icon: Landmark,
    ringClass: 'stroke-slate-400',
    bgClass: 'fill-slate-700/30',
    iconClass: 'text-slate-300',
    dashed: true,
  },
}

// Permissioned Domain encloses only the credentialed traders. The XRPL DEX
// sits outside — the DEX is a shared substrate accessible to anyone; the PD
// only governs which accounts can place / consume permissioned offers.
const PD_BOX = {
  x: 470,
  y: 290,
  w: 180,
  h: 470,
}

// Anchor point on the PD box edge that the PermissionedDomainSet edge targets.
// Top-right corner area, closest to the Domain Owner node.
const PD_ANCHOR = { x: PD_BOX.x + PD_BOX.w, y: PD_BOX.y + 30 }

interface EdgeMeta {
  from: FlowNode
  to: FlowNode | 'pdBox'
  curve: number
  selfLoop?: 'left' | 'right'
  dashed?: boolean
  // Optional override for the label that sits on the edge midpoint.
  labelOverride?: string
}

// Curvatures fanned out so multi-edge pairs (Issuer↔Trader A has 3, Issuer↔
// Trader B has 3, Trader B↔DEX has 2) don't overlap within a single phase.
// Edges from different phases may share visual space — that's fine because
// only one phase is filtered on at a time.
const EDGE_META: Record<string, EdgeMeta> = {
  // p1-faucet intentionally absent — out-of-band infrastructure step, surfaced
  // in the Setup tab but not in the flow diagram.
  'p1-trustset-a': { from: 'traderA', to: 'issuer', curve: -60 },
  'p1-trustset-b': { from: 'traderB', to: 'issuer', curve: 30 },
  'p1-sepa': {
    from: 'traderB',
    to: 'bank',
    curve: 0,
    dashed: true,
    labelOverride: 'SEPA Payment (EUR)',
  },
  'p1-pay-iou': { from: 'issuer', to: 'traderB', curve: 30 },
  'p2-cred-a': { from: 'issuer', to: 'traderA', curve: 20 },
  'p2-cred-b': { from: 'issuer', to: 'traderB', curve: -30 },
  'p2-accept-a': {
    from: 'traderA',
    to: 'traderA',
    curve: 0,
    selfLoop: 'left',
  },
  'p2-accept-b': {
    from: 'traderB',
    to: 'traderB',
    curve: 0,
    selfLoop: 'left',
  },
  'p3-domain': {
    from: 'domainOwner',
    to: 'pdBox',
    curve: 0,
    labelOverride: 'PermissionedDomainSet',
  },
  'p4-offer-a': {
    from: 'traderA',
    to: 'xrplDex',
    curve: -20,
    labelOverride: 'Permissioned OfferCreate',
  },
  'p4-offer-b': {
    from: 'traderB',
    to: 'xrplDex',
    curve: 25,
    labelOverride: 'Permissioned OfferCreate',
  },
  'p4-offer-open': {
    from: 'traderB',
    to: 'xrplDex',
    curve: -70,
    labelOverride: 'Open OfferCreate (no DomainID)',
  },
  'p5-burn': { from: 'traderA', to: 'issuer', curve: 60 },
  'p5-redeem': { from: 'issuer', to: 'bank', curve: 100, dashed: true },
}

const PHASE_STROKE: Record<Phase, string> = {
  setup: '#cbd5e1', // slate-300
  credentials: '#818cf8', // indigo-400
  domain: '#a78bfa', // violet-400
  trading: '#fb923c', // orange-400
  redemption: '#fb7185', // rose-400
}

const PHASE_CHIP: Record<Phase, string> = {
  setup: 'bg-slate-500/15 text-slate-200 ring-slate-400/40',
  credentials: 'bg-indigo-500/15 text-indigo-200 ring-indigo-400/40',
  domain: 'bg-violet-500/15 text-violet-200 ring-violet-400/40',
  trading: 'bg-orange-500/15 text-orange-200 ring-orange-400/40',
  redemption: 'bg-rose-500/15 text-rose-200 ring-rose-400/40',
}

// ---------- Path helpers ----------

type Point = { x: number; y: number }

function curvePath(
  from: { x: number; y: number; r: number },
  to: { x: number; y: number; r: number },
  curve: number,
): { d: string; mid: Point } {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return { d: '', mid: from }
  const ux = dx / len
  const uy = dy / len
  const pad = 4
  const start = { x: from.x + ux * from.r, y: from.y + uy * from.r }
  const end = { x: to.x - ux * (to.r + pad), y: to.y - uy * (to.r + pad) }
  const px = -uy
  const py = ux
  const ctrl = {
    x: (start.x + end.x) / 2 + px * curve,
    y: (start.y + end.y) / 2 + py * curve,
  }
  // Midpoint of quadratic Bezier at t=0.5
  const mid = {
    x: 0.25 * start.x + 0.5 * ctrl.x + 0.25 * end.x,
    y: 0.25 * start.y + 0.5 * ctrl.y + 0.25 * end.y,
  }
  return {
    d: `M ${start.x} ${start.y} Q ${ctrl.x} ${ctrl.y} ${end.x} ${end.y}`,
    mid,
  }
}

function selfLoopPath(
  node: NodeSpec,
  side: 'left' | 'right',
): { d: string; mid: Point } {
  const dir = side === 'left' ? -1 : 1
  const r = node.r
  const start = { x: node.x + dir * r * 0.55, y: node.y - r * 0.82 }
  const end = { x: node.x + dir * r * 0.95, y: node.y - r * 0.15 }
  const c1 = { x: node.x + dir * (r + 55), y: node.y - r - 40 }
  const c2 = { x: node.x + dir * (r + 62), y: node.y - r * 0.05 }
  const d = `M ${start.x} ${start.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`
  const mid = { x: node.x + dir * (r + 52), y: node.y - r * 0.85 }
  return { d, mid }
}

// ---------- Component ----------

interface Props {
  completed: Set<string>
  onSelectStep: (stepId: string) => void
}

export function FlowDiagram({ completed, onSelectStep }: Props) {
  // One phase at a time — showing every edge at once was unreadable.
  const [filter, setFilter] = useState<Phase>('setup')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState<Point | null>(null)
  const [zoomIdx, setZoomIdx] = useState(DEFAULT_ZOOM_IDX)
  const zoom = ZOOM_LEVELS[zoomIdx]

  const visibleSteps = useMemo(
    () => STEPS.filter((s) => s.phase === filter),
    [filter],
  )

  // Permissioned Domain box appears in two contexts:
  //   • Domain phase view: after PermissionedDomainSet is submitted, so the
  //     creation of the domain is the "reveal".
  //   • Trading phase view: once both traders have accepted their credentials,
  //     making explicit which accounts the domain encloses for the trade.
  // Hidden in other phases — would be visual noise where it adds no meaning.
  const pdBoxVisible =
    (filter === 'domain' && completed.has('p3-domain')) ||
    (filter === 'trading' &&
      completed.has('p2-accept-a') &&
      completed.has('p2-accept-b'))

  const hoveredStep = useMemo(
    () => (hoveredId ? STEPS.find((s) => s.id === hoveredId) : null),
    [hoveredId],
  )

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const traderACredentialed = completed.has('p2-accept-a')
  const traderBCredentialed = completed.has('p2-accept-b')

  return (
    <div className="relative">
      <header className="flex items-center gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <Workflow className="w-4 h-4 text-indigo-300" />
          <span className="text-sm font-semibold text-white">
            End-to-end flow
          </span>
          <span className="text-xs text-slate-400">
            · click any edge to jump to that transaction
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {PHASE_ORDER.map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={`px-2.5 py-1 rounded-full text-[11px] ring-1 transition-colors ${
                filter === p
                  ? PHASE_CHIP[p] + ' ring-2'
                  : 'bg-slate-800/60 text-slate-300 ring-slate-700 hover:bg-slate-800'
              }`}
            >
              {PHASE_LABELS[p]}
            </button>
          ))}
        </div>
      </header>

      <div
        className="relative rounded-2xl bg-slate-900/40 ring-1 ring-slate-800 overflow-auto"
        style={{ maxHeight: '70vh' }}
        onMouseMove={handleMove}
      >
        <ZoomControls
          zoom={zoom}
          canZoomOut={zoomIdx > 0}
          canZoomIn={zoomIdx < ZOOM_LEVELS.length - 1}
          onZoomOut={() => setZoomIdx((i) => Math.max(0, i - 1))}
          onZoomIn={() =>
            setZoomIdx((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1))
          }
          onReset={() => setZoomIdx(DEFAULT_ZOOM_IDX)}
        />

        <svg
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          width={VIEWBOX_W * zoom}
          height={VIEWBOX_H * zoom}
          className="select-none block"
          role="img"
          aria-label="PDex demo end-to-end flow diagram"
        >
          <defs>
            <radialGradient id="flowBg" cx="50%" cy="40%" r="70%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#0b1020" stopOpacity="0" />
            </radialGradient>
            {Object.entries(PHASE_STROKE).map(([phase, color]) => (
              <marker
                key={phase}
                id={`arrow-${phase}`}
                viewBox="0 0 10 10"
                refX="8.5"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
              </marker>
            ))}
            <filter id="nodeShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow
                dx="0"
                dy="2"
                stdDeviation="4"
                floodColor="#000"
                floodOpacity="0.45"
              />
            </filter>
          </defs>
          <rect
            width={VIEWBOX_W}
            height={VIEWBOX_H}
            fill="url(#flowBg)"
          />

          {/* Permissioned Domain — only exists on-ledger after p3-domain. */}
          {pdBoxVisible && <PermissionedDomainBox />}

          {/* Edges */}
          {visibleSteps.map((step) => (
            <EdgeShape
              key={step.id}
              step={step}
              isCompleted={completed.has(step.id)}
              isHovered={hoveredId === step.id}
              onHover={setHoveredId}
              onSelect={onSelectStep}
            />
          ))}

          {/* Nodes (on top of edges so arrowheads tuck into the ring) */}
          {(Object.keys(NODES) as FlowNode[]).map((key) => (
            <NodeShape
              key={key}
              node={NODES[key]}
              showCredential={
                (key === 'traderA' && traderACredentialed) ||
                (key === 'traderB' && traderBCredentialed)
              }
            />
          ))}

          {/* Legend bottom-left */}
          <Legend />
        </svg>

        {hoveredStep && mousePos && (
          <FlowTooltip
            step={hoveredStep}
            pos={mousePos}
            done={completed.has(hoveredStep.id)}
          />
        )}
      </div>

      <p className="mt-2 text-[11px] text-slate-500">
        Diagram is conceptual — every visible edge maps to one of the 13
        transactions in the phase tabs.
      </p>
    </div>
  )
}

// ---------- Sub-components ----------

function ZoomControls({
  zoom,
  canZoomOut,
  canZoomIn,
  onZoomOut,
  onZoomIn,
  onReset,
}: {
  zoom: number
  canZoomOut: boolean
  canZoomIn: boolean
  onZoomOut: () => void
  onZoomIn: () => void
  onReset: () => void
}) {
  return (
    <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-lg bg-slate-900/90 ring-1 ring-slate-700 backdrop-blur p-1 shadow-lg">
      <button
        onClick={onZoomOut}
        disabled={!canZoomOut}
        aria-label="Zoom out"
        className="p-1.5 rounded-md text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onReset}
        className="px-2 py-0.5 text-[11px] font-mono text-slate-300 hover:text-white"
        title="Reset zoom"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        onClick={onZoomIn}
        disabled={!canZoomIn}
        aria-label="Zoom in"
        className="p-1.5 rounded-md text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
      <div className="w-px h-4 bg-slate-700 mx-0.5" />
      <button
        onClick={onReset}
        aria-label="Reset zoom"
        className="p-1.5 rounded-md text-slate-300 hover:bg-slate-800"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function PermissionedDomainBox() {
  return (
    <g>
      <rect
        x={PD_BOX.x}
        y={PD_BOX.y}
        width={PD_BOX.w}
        height={PD_BOX.h}
        rx={22}
        fill="#67e8f912"
        stroke="#67e8f9"
        strokeWidth={2.5}
        strokeOpacity={0.85}
      />
      <text
        x={PD_BOX.x + PD_BOX.w / 2}
        y={PD_BOX.y - 12}
        textAnchor="middle"
        fontSize={13}
        fontWeight={600}
        fill="#67e8f9"
        letterSpacing={1}
      >
        PERMISSIONED DOMAIN
      </text>
      <text
        x={PD_BOX.x + PD_BOX.w / 2}
        y={PD_BOX.y + PD_BOX.h + 22}
        textAnchor="middle"
        fontSize={11}
        fill="#a5f3fc"
        opacity={0.8}
      >
        requires KYC_VERIFIED credential
      </text>
    </g>
  )
}

interface EdgeShapeProps {
  step: DemoStep
  isCompleted: boolean
  isHovered: boolean
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
}

function EdgeShape({
  step,
  isCompleted,
  isHovered,
  onHover,
  onSelect,
}: EdgeShapeProps) {
  const meta = EDGE_META[step.id]
  if (!meta) return null
  const fromNode = NODES[meta.from]
  const fromEP = { x: fromNode.x, y: fromNode.y, r: fromNode.r }
  let pathInfo: { d: string; mid: Point }
  if (meta.selfLoop) {
    pathInfo = selfLoopPath(fromNode, meta.selfLoop)
  } else if (meta.to === 'pdBox') {
    const target = { x: PD_ANCHOR.x, y: PD_ANCHOR.y, r: 6 }
    pathInfo = curvePath(fromEP, target, meta.curve)
  } else {
    const toNode = NODES[meta.to]
    pathInfo = curvePath(
      fromEP,
      { x: toNode.x, y: toNode.y, r: toNode.r },
      meta.curve,
    )
  }
  const { d, mid } = pathInfo

  const color = PHASE_STROKE[step.phase]
  const strokeWidth = isHovered ? 4 : isCompleted ? 2.6 : 2
  const opacity = isHovered ? 1 : isCompleted ? 0.95 : 0.72
  const dashArray = meta.dashed ? '8 5' : undefined
  const labelText = meta.labelOverride ?? step.txType

  return (
    <g
      className="cursor-pointer"
      onMouseEnter={() => onHover(step.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(step.id)}
    >
      {/* Wide invisible hit area for forgiving hover */}
      <path d={d} stroke="transparent" strokeWidth={20} fill="none" />
      <path
        d={d}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeOpacity={opacity}
        strokeDasharray={dashArray}
        fill="none"
        markerEnd={`url(#arrow-${step.phase})`}
        style={{
          transition: 'stroke-width 120ms, stroke-opacity 120ms',
        }}
      />
      <EdgeLabel
        x={mid.x}
        y={mid.y}
        text={labelText}
        color={color}
        done={isCompleted}
        emphasised={isHovered}
      />
    </g>
  )
}

function EdgeLabel({
  x,
  y,
  text,
  color,
  done,
  emphasised,
}: {
  x: number
  y: number
  text: string
  color: string
  done: boolean
  emphasised: boolean
}) {
  const fontSize = 12
  const padX = 7
  const padY = 4
  // Rough character-width estimate for monospace at fontSize 12.
  const textWidth = text.length * 6.8 + (done ? 14 : 0)
  const w = textWidth + padX * 2
  const h = fontSize + padY * 2
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={h / 2}
        fill="#0b1020"
        stroke={color}
        strokeOpacity={emphasised ? 0.95 : 0.55}
        strokeWidth={1}
      />
      {done && (
        <g transform={`translate(${x - w / 2 + padX} ${y - 6})`}>
          <circle cx="6" cy="6" r="5.5" fill={color} fillOpacity={0.22} />
          <path
            d="M 3 6 L 5.2 8.2 L 9 4.4"
            stroke={color}
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
      <text
        x={x + (done ? 7 : 0)}
        y={y + 0.5}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={fontSize}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fill="#e2e8f0"
      >
        {text}
      </text>
    </g>
  )
}

function NodeShape({
  node,
  showCredential,
}: {
  node: NodeSpec
  showCredential?: boolean
}) {
  const { Icon } = node
  return (
    <g style={{ pointerEvents: 'none' }}>
      <circle
        cx={node.x}
        cy={node.y}
        r={node.r}
        className={`${node.bgClass} ${node.ringClass}`}
        strokeWidth={2.5}
        strokeDasharray={node.dashed ? '6 4' : undefined}
        filter="url(#nodeShadow)"
      />
      <foreignObject
        x={node.x - 18}
        y={node.y - 18}
        width={36}
        height={36}
      >
        <div
          className={`flex items-center justify-center w-9 h-9 ${node.iconClass}`}
        >
          <Icon className="w-8 h-8" strokeWidth={1.6} />
        </div>
      </foreignObject>
      {showCredential && (
        <g transform={`translate(${node.x + node.r * 0.75} ${node.y - node.r * 0.75})`}>
          <circle cx="0" cy="0" r="11" fill="#0b1020" stroke="#10b981" strokeWidth={2} />
          <path
            d="M -4 0 L -1.2 3 L 4.5 -3.5"
            stroke="#34d399"
            strokeWidth={2.2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
      <text
        x={node.x}
        y={node.y + node.r + 22}
        textAnchor="middle"
        fontSize={15}
        fontWeight={600}
        fill="#f1f5f9"
      >
        {node.label}
      </text>
      {node.sub && (
        <text
          x={node.x}
          y={node.y + node.r + 40}
          textAnchor="middle"
          fontSize={11.5}
          fill="#94a3b8"
        >
          {node.sub}
        </text>
      )}
    </g>
  )
}

function Legend() {
  const X = 40
  const Y = VIEWBOX_H - 80
  const lineLen = 36
  const rowH = 22
  const rows = [
    { label: 'On-ledger', dashed: false },
    { label: 'Off-ledger', dashed: true },
  ]
  const boxW = 220
  const boxH = rows.length * rowH + 26
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect
        x={X - 12}
        y={Y - 18}
        width={boxW}
        height={boxH}
        rx={12}
        fill="#0b1020"
        fillOpacity={0.78}
        stroke="#334155"
      />
      <text
        x={X}
        y={Y}
        fontSize={11}
        fontWeight={600}
        fill="#94a3b8"
        letterSpacing={1}
      >
        LEGEND
      </text>
      {rows.map((r, i) => {
        const y = Y + 22 + i * rowH
        return (
          <g key={r.label}>
            <line
              x1={X}
              y1={y}
              x2={X + lineLen}
              y2={y}
              stroke="#cbd5e1"
              strokeWidth={2.5}
              strokeDasharray={r.dashed ? '6 4' : undefined}
              strokeOpacity={0.9}
            />
            <text
              x={X + lineLen + 10}
              y={y + 0.5}
              dominantBaseline="middle"
              fontSize={12}
              fill="#cbd5e1"
            >
              {r.label}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function FlowTooltip({
  step,
  pos,
  done,
}: {
  step: DemoStep
  pos: Point
  done: boolean
}) {
  const offsetX = 14
  const offsetY = 14
  return (
    <div
      style={{
        position: 'absolute',
        left: pos.x + offsetX,
        top: pos.y + offsetY,
        pointerEvents: 'none',
        maxWidth: 300,
      }}
      className="z-20 rounded-lg bg-slate-950/95 ring-1 ring-slate-700 px-3 py-2 shadow-2xl"
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider ring-1 ${PHASE_CHIP[step.phase]}`}
        >
          {PHASE_LABELS[step.phase]}
        </span>
        <span className="font-mono text-[11px] text-slate-300">
          {step.txType}
        </span>
        {done && (
          <span className="ml-auto inline-flex items-center gap-0.5 text-[10px] text-emerald-300">
            <Check className="w-3 h-3" />
            done
          </span>
        )}
      </div>
      <div className="text-sm font-semibold text-white leading-snug">
        {step.title}
      </div>
      <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
        {step.description}
      </div>
      <div className="text-[10px] text-slate-500 mt-1.5 italic">
        click to open this transaction
      </div>
    </div>
  )
}
