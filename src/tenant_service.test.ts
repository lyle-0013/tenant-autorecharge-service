import test from "node:test";
import assert from "node:assert/strict";
import { onboardTenant } from "./tenant_service.ts";

test("onboarding arms recharge after validating the tenant policy", async () => {
  const calls: Array<{ method: string; path: string; body: unknown }> = [];
  const client = {
    setBudget: async (body: unknown) => { calls.push({ method: "PUT", path: "/account/budget/set", body }); },
    configureAutorecharge: async (body: unknown) => { calls.push({ method: "PUT", path: "/account/autorecharge/configure", body }); }
  } as never;
  const result = await onboardTenant(client, { tenant_id: "acme", alert_threshold_usd: 5, recharge_amount: 25, trigger_balance: 3, period: "monthly" });
  assert.deepEqual(result, { tenant_id: "acme", lifecycle: "active", recharge: "armed" });
  assert.deepEqual(calls.map((call) => call.path), ["/account/budget/set", "/account/autorecharge/configure"]);
});
