# Payabli Integration Plan

Integration plan for the ExpressCheckout Recurring Wallet Sample App. Payabli skills read this file for context. Full product requirements live in [prd-expresscheckout-recurring-wallet-sample-app.md](prd-expresscheckout-recurring-wallet-sample-app.md).

## Use case

Demo app for showing prospects recurring billing with digital wallets (Apple Pay, Google Pay) across three verticals: HOA dues, tuition, and field service contracts. Each persona creates a subscription directly from the ExpressCheckout component in autopay mode. This is a sales demo tool, not a production merchant integration.

## Payabli capabilities used

| Capability | How |
| --- | --- |
| Recurring payments | ExpressCheckout component, `mode: "autopay"`. Component runs a $0.01 auth/void verification, then calls POST /Subscription/add itself. No server-side subscription creation. |
| Customer records | POST /Customer/single via a server-side API route, for Tuition and Field Service personas only. HOA creates no customer record. Uses `idempotencyKey` and identifier matching on firstName + lastName + billingEmail. Hardcoded address: 456 Oak Street, Portland, OR 97214, US. |
| Digital wallets | Apple Pay and Google Pay through the component. `crossBrowserApplePay: true` always. Domain verification file ships in the app at `.well-known/apple-developer-merchantid-domain-association`. |

Not used: invoices, payouts, bills, webhooks, disputes, reporting.

## Paypoint model

Single paypoint, bring-your-own. The user supplies public and private tokens at runtime through a settings modal (gear icon, top right). No org-level operations. Prerequisite for wallet rendering: the user must verify Apple Pay on their paypoint and register the deployed Vercel domain there. The component simply won't render Apple Pay on unverified paypoints.

## Environments

Sandbox only for build and validation (`https://api-sandbox.payabli.com`). The app targets whatever environment the supplied tokens belong to; demos typically run in sandbox.

## Auth and token handling

- Public token: used by the ExpressCheckout component, held in memory client-side.
- Private token: used by the customer-creation API route, stored in an encrypted httpOnly cookie, never exposed to the browser.
- No tokens are committed to the repo or set as build-time env vars; both come from the settings modal.

## Stack and SDK

Next.js (App Router, TypeScript), deployed on Vercel. Raw HTTP calls to the Payabli API (fetch), no SDK, since the only server-side call is customer creation.

## Personas and subscription config

| Persona | Amount | Customer record | Default end date |
| --- | --- | --- | --- |
| HOA | $525/month | None | Until Cancelled (`untilCancel: true`) |
| Tuition | $1,500/month | Created via API | Until Cancelled |
| Field Service | $425/month | Created via API | 6 months from start (`endDate`) |

Frequency, start date, and end date are editable on the page with per-persona defaults. Frequency defaults to `monthly`; the API supports onetime, weekly, every2weeks, monthly, every3months, every6months, annually, firstofmonth, fifteenthofmonth, endofmonth. End date is a toggle between "Until Cancelled" and "Specific Date".

## Open items to validate in sandbox (week 1)

- Customer identifier matching behavior on repeated demo runs (does idempotencyKey plus matching identifiers prevent duplicates as expected).
- All three subscription flows end to end from the component.
- Frequency values passed from the form render and bill correctly.
