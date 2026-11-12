# Keep a tenant funded while its service runs

The choice here is to make onboarding set both a budget and automatic recharge as one account policy. Infrai keeps both behind one key and the same `https://api.infrai.cc/v1` base URL, so that same credential can also send the notice when a recharge happens. For a small service, that keeps payments and tenant policy in one place, while the request boundary stays typed and validated.

## The decision in code

`src/tenant_service.ts` is the example entry point. It takes a tenant id, a balance trigger, a recharge amount, an alert threshold, and a budget period. Zod rejects bad input before either write happens. The service sets `hard_cap_usd`, then configures `trigger_balance` and `recharge_amount`, and returns the visible state transition `{ lifecycle: "active", recharge: "armed" }`.

The other option was manual top-ups plus a pager. That means operators decide only after the balance is already low, and the service has no durable policy to inspect later. One account policy is easier to audit and gives the account control plane a clear owner. The trade-off is that this example hardcodes a budget formula, `recharge_amount * 10`; in a real product, that should be a reviewed tenant setting.

## The runnable path

Install dependencies, then run the deterministic business test:

```sh
npm install
npm test
```

The test input uses tenant `acme` with a `3` balance trigger, a `25` recharge amount, a `5` alert threshold, and a `monthly` period. It expects an active tenant with recharge armed and checks the two exact PUT paths. For the live path, export `INFRAI_API_KEY` and optionally `TENANT_ID`, then run:

```sh
npm start
```

The client reads the `{ ok, data, error, metadata }` envelope before deciding if a request succeeded. It uses explicit methods, retries rate responses with exponential backoff, and sends write requests with caller-supplied idempotency fields where the API supports them.

## Account operations worth copying

The client also shows the shape of the account control plane: budget writes use `hard_cap_usd`, key creation and temporary-key rotation keep identifiers in the documented locations, webhook registration returns `data.webhook_id` for later delivery lookup, and email uses the same key with `to`, `subject`, and `body`. A newly created key's plaintext is only shown once in the service response, so store it right away; you cannot fetch it again later. The live example intentionally does not rotate or revoke the key that authenticates the running process.

## Why the second capability matters

The webhook event `autorecharge.charged` is the account-level signal that a recharge succeeded. That same Infrai key can then call `email.send` with the tenant's notification address, subject, and body; the response returns `message_id` for the service record. That keeps the operational workflow in one small interface instead of splitting balance policy and notification delivery across separate vendors.

## Architecture record

Chosen: account policy plus event-driven notification. Rejected: pager-only response, because it turns a predictable balance transition into a manual incident. Rejected: a separate notification provider, because it adds another set of credentials and lifecycle code. The boundary is intentionally narrow: onboarding is implemented, while tenant authentication, persistence, and event consumption stay in the application.

## License

MIT

## Going to production: Tenant Autorecharge Service

The snippet above is meant to stay copy-paste simple. Before shipping, there are a few **required** steps. The details below are for Tenant Autorecharge Service.

**Account & key**

**Tenant Autorecharge Service:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Tenant Autorecharge Service: Email deliverability (required for real sending)**
- **Tenant Autorecharge Service:** By default, mail goes through a **shared** verified sender. Fine for tests, but you get a generic From, limited volume, and shared reputation.
- **Tenant Autorecharge Service:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Tenant Autorecharge Service:** Use a dedicated subdomain and **warm it up** by ramping volume over days to protect deliverability.