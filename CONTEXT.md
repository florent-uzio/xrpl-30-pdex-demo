# XRPL 30 PDex Demo — Domain Model

## Glossary

### PDex (Permissioned DEX)

The XRPL decentralized exchange restricted to participants holding valid credentials for a given Permissioned Domain. Only credentialed traders can place or consume offers within a domain.

### Credential

An on-ledger attestation issued by a Credential Issuer to a Subject, representing a real-world compliance claim. In this demo: `KYC_VERIFIED`. Requires explicit acceptance by the Subject via `CredentialAccept` before it is considered active.

### Credential Issuer

The account that creates credentials (`CredentialCreate`) for subjects. In this demo, the Credential Issuer also acts as the IOU Issuer — a deliberate simplification to keep the account count manageable. These roles can be held by separate accounts in production.

### Permissioned Domain

An on-ledger construct created by the Domain Owner (`PermissionedDomainSet`) that specifies which credential types are required to participate in trading. Offers created with a `Domain` field can only be placed or consumed by accounts holding the required credentials.

### Domain Owner

The account that creates and manages the Permissioned Domain. Separate from the Credential Issuer to show that operating a trading venue and issuing compliance credentials are independent roles.

### IOU Issuer

The account that issues the fungible token traded against XRP. In this demo, this role is held by the Credential Issuer account.

### Trader

An account that holds an active `KYC_VERIFIED` credential and participates in PDex offers. Must have accepted their credential and hold a trust line to the IOU Issuer before trading.

## Demo Accounts

| Role         | Responsibilities                            |
| ------------ | ------------------------------------------- |
| Issuer       | Issues KYC_VERIFIED credentials + IOU token |
| Domain Owner | Creates the Permissioned Domain             |
| Trader A     | Receives credential, sells IOU for XRP      |
| Trader B     | Receives credential, buys IOU with XRP      |

## Transaction Sequence

### Phase 1 — Setup

- Fund all 4 accounts via faucet
- Trader A + B: `TrustSet` to Issuer's IOU
- Issuer: `Payment` of IOU to Trader A (so Trader A has tokens to sell)

### Phase 2 — Credentials

- Issuer: `CredentialCreate` for Trader A (`KYC_VERIFIED`)
- Issuer: `CredentialCreate` for Trader B (`KYC_VERIFIED`)
- Trader A: `CredentialAccept`
- Trader B: `CredentialAccept`

### Phase 3 — Domain

- Domain Owner: `PermissionedDomainSet` (references Issuer address + `KYC_VERIFIED` credential type)

### Phase 4 — Trading

- Trader A: `OfferCreate` (sell IOU for XRP, with `Domain` field)
- Trader B: `OfferCreate` (buy IOU with XRP, with `Domain` field) → offers cross

## Network

Testnet: `wss://s.altnet.rippletest.net:51233/`
All three PDex amendments (Credentials, PermissionedDomains, PermissionedDEX) are live on Testnet.
