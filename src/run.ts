import { InfraiClient } from "./infrai_client.ts";
import { onboardTenant } from "./tenant_service.ts";

const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("Set INFRAI_API_KEY before running the live example");
const result = await onboardTenant(new InfraiClient(key), {
  tenant_id: process.env.TENANT_ID ?? "demo-tenant",
  alert_threshold_usd: 5,
  recharge_amount: 25,
  trigger_balance: 3,
  period: "monthly"
});
console.log(JSON.stringify(result));
