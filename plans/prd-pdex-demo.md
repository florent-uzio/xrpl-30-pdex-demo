# PRD: PDex Demo — YouTube-Recordable XRPL Permissioned DEX Walkthrough

**Status:** Ready for implementation  
**Date:** 2026-05-22  
**ADRs:** [0001 — Issuer doubles as IOU Issuer](../docs/adr/0001-issuer-doubles-as-iou-issuer.md)

---

## Problem Statement

Developer advocates at XRPL Commons need a polished, screen-recordable demo application that explains the XRPL Permissioned DEX (PDex) stack — Credentials, Permissioned Domains, and Payments-on-DEX — to a technical audience via YouTube. Today there is no such tool: existing demos (batch, mpt-demo) cover different primitives and are not structured for step-by-step narrated video. Someone watching a PDex explainer video cannot follow along interactively; the only way to explore the feature is to read the XRPL documentation and stitch together raw transactions manually.

---

## Solution

A single-page React application that narrates a complete PDex round-trip: 1 000 EUR enters the system (Trader B via SEPA), 1 000 EURF are minted on-ledger, 100 EURF change hands through a permissioned DEX trade, and 100 EUR exit to Trader A's French IBAN — all on XRPL Testnet. Four persistent account cards at the top of the screen accumulate visual badges as each phase completes, giving the audience a live permission dashboard they can follow without pause. Each of the 15 demo steps exposes the exact XRPL transaction JSON (or off-ledger API payload) via an inline inspector, letting the presenter narrate the wire format without switching tools.

The prototype (Variant A — "Permission Dashboard") has validated this layout. Implementation ships that design with real xrpl.js calls replacing the mocked state.

---

## User Stories

### Setup & Environment

1. As a presenter, I want all four demo wallets (Issuer, Domain Owner, Trader A, Trader B) funded in a single step, so that setup does not consume video time on housekeeping.
2. As a presenter, I want the Testnet URL visible in the app header at all times, so that the audience always knows which network is running.
3. As a presenter, I want the app to start with all XRP balances showing 0, so that the faucet step visibly demonstrates the funding happening on-screen.
4. As a presenter, I want each account's live XRP and EURF balances to update immediately after the relevant step completes, so that the audience can see ledger state change in real time.
5. As a viewer, I want to see four labelled account cards — Issuer, Domain Owner, Trader A, Trader B — laid out persistently at the top of the screen, so that I always have a reference for who is doing what.
6. As a viewer, I want each account card to display the account's XRPL address, so that I can cross-reference it in an explorer.
7. As a viewer, I want the app to display a disclaimer that the Issuer doubling as IOU Issuer is a demo simplification (not a production pattern), so that I do not incorrectly apply this design in real systems.

### Phase Navigation

8. As a presenter, I want five phase tabs (Setup / Credentials / Domain / Trading / Redemption) below the account cards, so that I can drive the audience through the demo one phase at a time.
9. As a presenter, I want to be able to jump to any phase tab at any time, so that I can replay individual steps during Q&A without resetting the whole demo.
10. As a presenter, I want each phase tab to be visually distinct by colour (slate / indigo / violet / orange / rose), so that the audience can orient themselves by colour as well as label.
11. As a viewer, I want to know at a glance how many steps are in the current phase and how many are already completed, so that I can follow the narrator's progress.

### Account Status Cards

12. As a viewer, I want each account card to accumulate visual badges as phases complete, so that I can see the permission model build up over the course of the demo.
13. As a viewer, I want the "EURF Trust Line" badge to appear on Trader A and Trader B after their TrustSet steps, so that I understand trust lines as a prerequisite for IOU holding.
14. As a viewer, I want the "Funded 1000 EURF" badge to appear on Trader B after the Issuer's Payment step, so that I understand EURF minting as the on-ledger consequence of the SEPA deposit.
15. As a viewer, I want the "KYC_VERIFIED" badge to appear on Trader A and Trader B after they each accept their credential, so that I understand that the credential is inert until the subject accepts it.
16. As a viewer, I want the "Domain Active" badge to appear on the Domain Owner after the PermissionedDomainSet step, so that I can see when the permissioned venue comes into existence.
17. As a viewer, I want the "Trade Executed" badge to appear on both Trader A and Trader B when the permissioned offers cross, so that I can see the moment of settlement.
18. As a viewer, I want the "FIAT Settled" badge to appear on Trader A after the off-ledger redemption request, so that I can see the full loop close.
19. As a viewer, I want the four account identity colours (amber / fuchsia / sky / emerald) used consistently on avatar tiles and actor chips throughout, so that I can associate an action with an account at a glance without reading the label.

### Flow Diagram

20. As a presenter, I want a flow diagram tab showing all 6 nodes (Issuer, Domain Owner, Trader A, Trader B, DEX, Trader A Bank) and their relationships, so that I can give the audience a system-level overview before executing any step.
21. As a presenter, I want to filter the flow diagram by phase using chip buttons, so that I can focus the audience's attention on the relevant actors per phase.
22. As a viewer, I want the flow diagram edges to use solid lines for on-ledger interactions and dashed lines for off-ledger (SEPA / API) interactions, so that I understand the boundary between the ledger and the real-world financial system.
23. As a viewer, I want the flow legend to show only "On-ledger" (solid) and "Off-ledger" (dashed) — nothing more — so that the legend does not require a colour key.
24. As a viewer, I want a cyan Permissioned Domain box to appear around Trader A and Trader B when the Domain or Trading filter is active and the relevant steps have completed, so that I can visually see which accounts operate inside the domain.
25. As a viewer, I want the Permissioned Domain box to be solid (not dashed), so that I understand it as an on-ledger object and not an off-chain concept.
26. As a viewer, I want the Domain Owner's PermissionedDomainSet edge to point at the domain boundary box, not at the Issuer node, so that I understand the Domain Owner is creating a venue, not sending a message to the Issuer.
27. As a presenter, I want no "All" filter chip on the flow, so that the diagram does not become unreadable from 13 simultaneous edges.
28. As a presenter, I want the faucet step absent from the flow diagram, so that infrastructure noise does not clutter the business-flow narrative.
29. As a presenter, I want zoom controls on the flow diagram (default 70%, range 50%–150%), so that I can fit the diagram in the recording viewport without cropping.

### Transaction Inspector

30. As a presenter, I want each step row to have an eye icon that expands an inline JSON inspector beneath it, so that I can show the wire format without leaving the dashboard.
31. As a presenter, I want the inspector to show syntax-highlighted JSON (keys=sky, strings=emerald, numbers=amber, literals=violet, punctuation=slate), so that field types are immediately legible to a developer audience.
32. As a presenter, I want both an "Execute" quick-path button and a "Sign & Submit" button inside the inspector, so that I can choose whether to narrate the signing step or skip it during the recording.
33. As a presenter, I want off-ledger steps (faucet, SEPA, redemption) to show a different inspector header ("Off-ledger API request") and submit button label ("Send Request"), so that the audience understands these are not XRPL transactions.
34. As a presenter, I want the SEPA inspector to display a realistic POST payload (IBAN, BIC, amount, beneficiary reference), so that the audience understands what backs the EURF on-ledger.
35. As a presenter, I want the redemption inspector to display a POST payload that references the burn transaction hash, so that the audience understands the off-ledger settlement is contingent on the on-chain burn.
36. As a viewer, I want to see realistic XRPL field names and values in the inspector (including the 40-char EURF hex, the credential type hex, and the DomainID), so that I can reproduce the transaction outside the demo.
37. As a viewer, I want the fee shown as 12 drops in every XRPL transaction inspector, so that I learn the drops denomination without the narrator needing to explain it.
38. As a presenter, I want a copy button on the inspector JSON, so that I can paste a transaction into an explorer during the recording.

### XRPL Transaction Execution

39. As a presenter, I want the faucet step to call `client.fundWallet()` for each of the four accounts in sequence, so that real funded wallets are created on Testnet.
40. As a presenter, I want the TrustSet steps to sign and submit a real `TrustSet` transaction using the trader's wallet, so that the audience can see the transaction hash and ledger close confirmation.
41. As a presenter, I want the Payment step (EURF mint) to sign and submit a real `Payment` transaction from the Issuer wallet, so that the 1 000 EURF balance is reflected on-ledger.
42. As a presenter, I want the CredentialCreate steps to sign and submit real `CredentialCreate` transactions from the Issuer wallet to each Trader, so that the credentials appear in the XRPL Testnet explorer.
43. As a presenter, I want the CredentialAccept steps to sign and submit real `CredentialAccept` transactions from each Trader's wallet, so that the credentials become active.
44. As a presenter, I want the PermissionedDomainSet step to sign and submit a real `PermissionedDomainSet` transaction from the Domain Owner's wallet, so that a live DomainID is generated on-ledger.
45. As a presenter, I want the OfferCreate (permissioned) steps to include the real DomainID returned from the PermissionedDomainSet step, so that the offers are correctly scoped to the Permissioned Domain.
46. As a presenter, I want the two permissioned OfferCreate transactions to visibly cross on-ledger (Trader A's offer consumed by Trader B's), so that the audience sees the DEX matching in action.
47. As a presenter, I want the open-book OfferCreate (no DomainID) to be labelled clearly as targeting the open XRPL DEX — still on-chain — so that the audience does not confuse "no domain" with "off-ledger."
48. As a presenter, I want the Payment (burn) step to sign and submit a real `Payment` from Trader A back to the Issuer, so that the EURF supply decreases on-ledger.
49. As a presenter, I want all transaction results (hash, ledger close time, outcome) displayed inline after each step, so that the audience has confirmation without switching to an explorer.

### Redemption (Payments on DEX)

50. As a viewer, I want to understand the full round-trip: 1 000 EUR in (Trader B SEPA) → 1 000 EURF minted → 100 EURF acquired by Trader A → 100 EUR out (Trader A SEPA), so that I can explain the end-to-end value flow of Payments-on-DEX to stakeholders.
51. As a presenter, I want the redemption step to show a mock POST to `issuer.example.com/v1/redemptions` with a realistic payload (referencing the burn tx hash, the IBAN, 100 EURF → 100 EUR), so that the settlement mechanics are clear to the audience even though we cannot demonstrate a live bank integration.
52. As a viewer, I want the redemption receipt to show an `RDMP-XXXXXX` reference number, so that it visually communicates "bank reference" rather than "XRPL hash."

### Cleanup / Production-Ready App

53. As a developer, I want Variants B and C and the PrototypeSwitcher removed from the codebase, so that the shipped app has no leftover prototype scaffolding.
54. As a developer, I want the `App.tsx` variant routing and `?variant=` URL param handling removed, so that the app routes directly to the Variant A dashboard.
55. As a developer, I want `NOTES.md` filled in (winner declared, bits-to-steal listed) and then deleted before the first production commit, so that prototype notes do not ship in the repository.

---

## Implementation Decisions

### Module 1: Demo State Machine (`useDemoState`)

The prototype's `useMockDemo` hook proved the shape. The real version replaces simulated step execution with `async` XRPL calls. Interface (from prototype, trimmed to the decision-rich parts):

```ts
// From prototype — the hook signature that won, to be re-implemented with real xrpl.js calls.
// runStep becomes async; accounts gain real addresses after the faucet step.
type DemoHook = {
  accounts: Account[]
  accountByRole: Map<AccountRole, Account>
  completed: Set<string>
  results: TxResult[]
  runStep: (step: DemoStep) => Promise<void>   // was sync in prototype
  reset: () => void
}
```

Key decisions:
- Wallets are generated once per session (on faucet call) and stored in module-level state — not in React state, so re-renders cannot overwrite private keys.
- The `DomainID` returned from `PermissionedDomainSet` is stored and injected into the OfferCreate payloads for p4-offer-a and p4-offer-b.
- Step execution is idempotent: re-submitting a completed step is a no-op.
- The `completed` set and `results` array are persisted to `localStorage` so a browser refresh does not lose demo progress mid-recording.
- EURF requires the 40-char hex form in all `currency` fields: `4555524600000000000000000000000000000000`. `KYC_VERIFIED` requires its hex form in all `CredentialType` fields.

### Module 2: XRPL Client (`xrplClient`)

A singleton `Client` connected to `wss://s.altnet.rippletest.net:51233/` (hardcoded). Exposes a typed wrapper per transaction type rather than raw `client.submit()` calls, so callers do not need to handle autofill manually. The `xrpl-js` skill's conventions for `Wallet`, autofill, sign, and submit apply throughout.

### Module 3: Transaction Builder (`buildTx`)

Pure functions (no async, no React) that map a `DemoStep` + runtime context (live addresses, DomainID) to a fully-shaped transaction object ready for sign-and-submit. This replaces `buildTxJson` in the prototype. By keeping it pure, the inspector can call `buildTx` synchronously to render the preview JSON before the user submits.

### Module 4: Account Cards + Badge System

Directly promotes the Variant A card design. Badge accumulation logic is driven by the `DemoStep.grants` map (already defined in the prototype types). No changes to the badge rules or the `Badge` type — the prototype validated these.

Color discipline is final and must not be extended:
- 4 account identity colours: amber / fuchsia / sky / emerald — avatar tile + actor chip only
- 5 phase colours: slate / indigo / violet / orange / rose — phase tabs + badge pills + flow edges
- Brand indigo: header, primary buttons
- Success emerald: done check icons
- Cyan: Permissioned Domain box only

### Module 5: Flow Diagram (`FlowDiagram`)

The SVG diagram is already built and validated. The only change at implementation time: `PD_ANCHOR` coordinates and PD box visibility rules need to reference live `completed` state (replacing mock `completed`). No structural changes to the diagram.

PD box visibility rules (locked in prototype):
- Domain phase filter + `p3-domain` completed → box visible
- Trading phase filter + both `p2-accept-a` AND `p2-accept-b` completed → box visible
- All other combinations → box hidden

Zoom is implemented via SVG `width`/`height` × zoom factor. Not CSS `transform`. Levels: `[0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.15, 1.3, 1.5]`, default `0.7`.

### Module 6: Transaction Inspector

Inline-expand per row (eye icon). Not a slide-out sheet. Both "Execute" (quick path) and "Sign & Submit" (expanded path showing signing step) coexist. HTTP-kind steps branch to a different header label and submit button text.

Inspector header copy per step type (to differentiate in the video):
- `p1-faucet` → "Testnet faucet · POST to faucet.altnet.rippletest.net"
- `p1-sepa` → "Off-ledger SEPA transfer · POST to bank API"
- `p5-redeem` → "Fiat redemption · POST to issuer redemption API"
- All XRPL steps → no special header; show `TransactionType` as the title

### Network & Config

Network URL is a single exported constant (`NETWORK_URL = 'wss://s.altnet.rippletest.net:51233/'`). It must be rendered visibly in the app header. No network switcher.

---

## Testing Decisions

**What makes a good test here:** test observable outputs — account badge state after a step, transaction JSON shape, PD box visibility given a `completed` set — not internal implementation details like which xrpl.js method was called.

**Modules to test:**

- **`buildTx`** (Transaction Builder) — pure functions, no async: verify the correct XRPL `TransactionType` is produced for each step ID, that EURF uses the 40-char hex, that KYC_VERIFIED uses the hex form, that `DomainID` is present in permissioned offers and absent in the open offer, that HTTP steps return the expected payload shape. These are unit tests.

- **`useDemoState`** — test the badge accumulation: given a sequence of `runStep` calls, assert the correct badges appear on the correct accounts. Test via React Testing Library's `renderHook`, driving the mock (or stub) XRPL client. Prior art in `mpt-demo/src/utils/transactionTracker.ts` for the localStorage persistence pattern.

- **Flow diagram PD box visibility** — pure function mapping `(phase filter, completed Set<string>) → boolean`. No React required; plain unit tests.

**Not tested:** the SVG rendering itself (visual regression), Framer Motion animations, or whether xrpl.js signs a transaction correctly (that's xrpl.js's responsibility, not ours).

---

## Out of Scope

- **Production deployment or hosting.** This is a local dev tool for recording a YouTube video.
- **Network switcher.** Testnet only. No Mainnet, no Devnet, no custom RPC.
- **5-account separation of Credential Issuer and IOU Issuer.** ADR 0001 is final; the Issuer doubles as both.
- **Real SEPA integration.** The SEPA step shows a realistic payload but does not call a live bank API.
- **Real redemption API.** The redemption step shows a realistic payload but does not call a live issuer endpoint.
- **Multi-currency support.** EURF is the only IOU. USD and other currencies are out of scope.
- **Offer order book depth or order book UI.** The demo shows two crossing offers only.
- **OfferDelete, OfferCancel, or any Offer lifecycle beyond the initial crossing.**
- **Mobile or small-screen layout.** Designed for a 1080p+ screen recording setup.
- **Authentication or user accounts.** Wallets are ephemeral and session-scoped.
- **Animated "play-all" affordance on the flow diagram.** Considered; deferred.
- **Variant B and Variant C of the prototype.** Both are dead weight post-decision; to be deleted as part of the cleanup task.

---

## Further Notes

- The `xrpl-js` skill provides the correct patterns for `Client`, `Wallet`, `fundWallet`, autofill, and the credential/permissioned-domain transaction types. Use it throughout the implementation phase.
- The prototype's `STEPS` array, `Phase` type, `DemoStep` interface, and `Badge` type are stable — the real implementation should promote them from `src/prototype/` to `src/` without structural changes.
- `buildTxJson` in the prototype contains the canonical field shapes for all 15 steps. The real `buildTx` should reproduce these shapes using live addresses (not fake ones), a real `DomainID`, and `xrpl.js` autofill for `Fee`/`Sequence`/`LastLedgerSequence`.
- The `xrpl` package is already in `pdex-demo/package.json`; no install step needed.
- Once real wallets are generated, the account addresses in the inspector JSON will be live Testnet addresses, making copy-paste into `xrpl.org/explorer` work out of the box — this is a valuable demo moment worth narrating.
- The CONTEXT.md glossary and ADR 0001 should be updated if any domain decisions change during implementation; they are the canonical reference for a future maintainer.
