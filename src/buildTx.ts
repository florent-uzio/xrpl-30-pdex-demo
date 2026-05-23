import type { Account, AccountRole, DemoStep } from './types'

export const EURF_HEX = '4555524600000000000000000000000000000000'
export const KYC_VERIFIED_HEX = '4B59435F564552494649454400000000'

const FAKE_DOMAIN_ID =
  'D0E1B5C0FFEEDA7AD0E1B5C0FFEEDA7AD0E1B5C0FFEEDA7AD0E1B5C0FFEEDA7A'

export interface BuildTxContext {
  accountByRole: Map<AccountRole, Account>
  domainId?: string
  burnTxHash?: string
}

export function buildTx(
  step: DemoStep,
  context: BuildTxContext,
): Record<string, unknown> {
  const { accountByRole, domainId, burnTxHash } = context
  const issuer = accountByRole.get('issuer')!
  const traderA = accountByRole.get('traderA')!
  const traderB = accountByRole.get('traderB')!
  const domainOwner = accountByRole.get('domainOwner')!
  const effectiveDomainId = domainId ?? FAKE_DOMAIN_ID

  switch (step.id) {
    case 'p1-faucet':
      return {
        method: 'POST',
        url: 'https://faucet.altnet.rippletest.net/accounts',
        calls: 4,
        wallets: [
          { role: 'Issuer', address: issuer.address, funded: '~100 XRP' },
          { role: 'Domain Owner', address: domainOwner.address, funded: '~100 XRP' },
          { role: 'Trader A', address: traderA.address, funded: '~100 XRP' },
          { role: 'Trader B', address: traderB.address, funded: '~100 XRP' },
        ],
      }
    case 'p1-sepa':
      return {
        method: 'POST',
        url: 'https://traderbank.example.com/v1/sepa/transfers',
        headers: {
          Authorization: 'Bearer ${TRADER_B_API_KEY}',
          'Content-Type': 'application/json',
        },
        body: {
          from: { name: 'Trader B', iban: 'DE89 3704 0044 0532 0130 00', bic: 'COBADEFFXXX' },
          to: { name: 'Issuer Bank', iban: 'FR14 2004 1010 0505 0001 3M02 606', bic: 'BNPAFRPPXXX' },
          amount: '1000.00',
          currency: 'EUR',
          rail: 'SEPA',
          reference: `Backing for EURF mint to ${traderB.address}`,
        },
      }
    case 'p1-trustset-a':
      return {
        TransactionType: 'TrustSet',
        Account: traderA.address,
        LimitAmount: { currency: EURF_HEX, issuer: issuer.address, value: '1000000' },
        Fee: '12',
      }
    case 'p1-trustset-b':
      return {
        TransactionType: 'TrustSet',
        Account: traderB.address,
        LimitAmount: { currency: EURF_HEX, issuer: issuer.address, value: '1000000' },
        Fee: '12',
      }
    case 'p1-payment':
      return {
        TransactionType: 'Payment',
        Account: issuer.address,
        Destination: traderB.address,
        Amount: { currency: EURF_HEX, issuer: issuer.address, value: '1000' },
        Fee: '12',
      }
    case 'p2-credcreate-a':
      return {
        TransactionType: 'CredentialCreate',
        Account: issuer.address,
        Subject: traderA.address,
        CredentialType: KYC_VERIFIED_HEX,
        Fee: '12',
      }
    case 'p2-credcreate-b':
      return {
        TransactionType: 'CredentialCreate',
        Account: issuer.address,
        Subject: traderB.address,
        CredentialType: KYC_VERIFIED_HEX,
        Fee: '12',
      }
    case 'p2-accept-a':
      return {
        TransactionType: 'CredentialAccept',
        Account: traderA.address,
        Issuer: issuer.address,
        CredentialType: KYC_VERIFIED_HEX,
        Fee: '12',
      }
    case 'p2-accept-b':
      return {
        TransactionType: 'CredentialAccept',
        Account: traderB.address,
        Issuer: issuer.address,
        CredentialType: KYC_VERIFIED_HEX,
        Fee: '12',
      }
    case 'p3-domain':
      return {
        TransactionType: 'PermissionedDomainSet',
        Account: domainOwner.address,
        AcceptedCredentials: [
          { Credential: { Issuer: issuer.address, CredentialType: KYC_VERIFIED_HEX } },
        ],
        Fee: '12',
      }
    case 'p4-offer-a':
      return {
        TransactionType: 'OfferCreate',
        Account: traderA.address,
        TakerGets: '100000000',
        TakerPays: { currency: EURF_HEX, issuer: issuer.address, value: '100' },
        DomainID: effectiveDomainId,
        Fee: '12',
      }
    case 'p4-offer-b':
      return {
        TransactionType: 'OfferCreate',
        Account: traderB.address,
        TakerGets: { currency: EURF_HEX, issuer: issuer.address, value: '100' },
        TakerPays: '100000000',
        DomainID: effectiveDomainId,
        Fee: '12',
      }
    case 'p4-open-offer':
      return {
        TransactionType: 'OfferCreate',
        Account: traderB.address,
        TakerGets: { currency: EURF_HEX, issuer: issuer.address, value: '50' },
        TakerPays: '50000000',
        Fee: '12',
      }
    case 'p5-burn':
      return {
        TransactionType: 'Payment',
        Account: traderA.address,
        Destination: issuer.address,
        Amount: { currency: EURF_HEX, issuer: issuer.address, value: '100' },
        Fee: '12',
      }
    case 'p5-redeem':
      return {
        method: 'POST',
        url: 'https://issuer.example.com/v1/redemptions',
        headers: {
          Authorization: 'Bearer ${ISSUER_API_KEY}',
          'Content-Type': 'application/json',
        },
        body: {
          burnTxHash: burnTxHash ?? '<hash from p5-burn>',
          subject: traderA.address,
          burned: { currency: 'EURF', amount: '100' },
          settle: {
            currency: 'EUR',
            amount: '100',
            destination: {
              beneficiary: 'Trader A',
              rail: 'SEPA',
              iban: 'FR76 3000 4000 0312 3456 7890 123',
              bic: 'BNPAFRPPXXX',
            },
          },
        },
      }
    default:
      return { TransactionType: step.txType, Account: '<unknown>' }
  }
}
