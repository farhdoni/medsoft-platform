# AIVITA — Payments

## Agreed model: patient wallet + batch payouts (keep it simple)

The chosen approach optimizes for practicality and easy reconciliation, not real-time complexity:

1. **Patient wallet** — patients hold a prepaid balance (`patients.depositBalance`). Topping up the
   wallet is the main payment event; paying for a consultation is a deduction from the wallet. This
   removes per-transaction friction and isolates provider integration to the top-up flow.
2. **One provider first.** Click, Payme, and Uzum are all integrated (`apps/api/src/routes/payments/`),
   but launch and harden ONE provider end-to-end before enabling the rest.
3. **Payouts to doctors/clinics are batch settlements** on a periodic schedule — not a real-time split
   on each transaction. Far simpler to build and reconcile.
4. **Commission** for referrals is ~10–15% of the consultation, taken at settlement.

Avoid real-time split-payment / escrow until there's a concrete reason; it multiplies edge cases.

## Webhook security (non-negotiable)

Every provider callback must, before changing any payment state:
- **verify the caller**: Payme via the `Authorization` header (`verifyPaymeAuth`), Click via signature
  (`verifyClickSign`), Uzum via `X-Uzum-Signature` (`verifyUzumSignature`, respond 403 on mismatch),
- **validate the amount** against the stored order/payment row (never trust the amount in the callback),
- **be idempotent**: the same provider transaction id must not be applied twice,
- confirm the verification helpers are real (not stubbed `return true`).

Provider brand colors (for buttons): Click `#00B4E6`, Payme `#33CCCC`, Uzum `#7B2D8E`.

## Pricing context (UZ market)

B2C: Free / Premium 29K / Family 49K / Annual 249K сум. Doctors: Free / Pro 99K / Premium 199K сум.
MedSoft START: 200K сум/mo (free until 30.09.2026 — clinic-acquisition flywheel). Promo `FIRST30` = −30%.
The likely stronger revenue engine in this market is B2B (MedSoft subscription + referral commission)
rather than B2C subscriptions; pressure-test B2C prices against local purchasing power.
