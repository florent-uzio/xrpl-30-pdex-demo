# PDex demo — UI prototype verdict

**Question:** What should the PDex demo UI look like? Specifically:
1. Account status card design (badges).
2. Phase layout (how the acting account is surfaced).
3. Whether transaction results appear inline or in a separate panel.

**Variants generated:**

- **A — Permission Dashboard** — 4 account cards always on top accumulate badges as phases run. Below: phase tabs with action list (left) + sticky tx-results panel (right). Closest to the handoff's default. Dashboard-style; parallel state.
- **B — Ledger Timeline** — Slim left rail of accounts, large vertical scrolling timeline with phase headers and per-tx rows. Results expand inline in each row. Chronological / explorer-style.
- **C — Stage Theater** — One huge spotlighted "current step" card with the acting account as a hero (Framer Motion fades between steps), supporting accounts as muted thumbnails. Horizontal step strip at the bottom. Cinematic; optimised for screen-recording narration.

## Verdict

_(to be filled in after the user flips through)_

- Winner:
- Bits to steal from the other variants:
- Notes / open questions:

## Next steps when a winner is chosen

1. Capture the decision (commit message or new ADR `0002-ui-shape.md`).
2. Delete the two losing variants + `PrototypeSwitcher` + this NOTES file.
3. Rewrite the winning variant against real `xrpl.js` calls (the mock state was throwaway).
4. Replace fake addresses / fake hashes with faucet-funded testnet accounts.
