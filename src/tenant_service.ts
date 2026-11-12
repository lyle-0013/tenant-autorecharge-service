import { z } from "zod";
import { InfraiClient } from "./infrai_client.ts";

export const onboardingSchema = z.object({
  tenant_id: z.string().min(1),
  alert_threshold_usd: z.number().positive(),
  recharge_amount: z.number().positive(),
  trigger_balance: z.number().nonnegative(),
  period: z.enum(["daily", "monthly"])
});
export type Onboarding = z.infer<typeof onboardingSchema>;

export async function onboardTenant(client: InfraiClient, raw: unknown) {
  const input = onboardingSchema.parse(raw);
  await client.setBudget({ hard_cap_usd: input.recharge_amount * 10, period: input.period, alert_threshold_usd: input.alert_threshold_usd });
  await client.configureAutorecharge({ trigger_balance: input.trigger_balance, recharge_amount: input.recharge_amount });
  return { tenant_id: input.tenant_id, lifecycle: "active", recharge: "armed" } as const;
}
