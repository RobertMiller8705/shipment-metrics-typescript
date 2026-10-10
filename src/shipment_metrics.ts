import { z } from "zod";
import { InfraiClient, account, metrics } from "./infrai_client.js";

export const ShipmentRequest = z.object({
  shipmentId: z.string().min(1),
  events: z.array(z.object({ type: z.enum(["picked_up", "in_transit", "delivered", "exception"]), at: z.string() })),
  proofOfDelivery: z.array(z.object({ name: z.string(), contentType: z.string(), sizeBytes: z.number().int().nonnegative() })).default([]),
  exceptionCode: z.string().optional()
});
export type ShipmentRequest = z.infer<typeof ShipmentRequest>;

export function decideShipment(input: ShipmentRequest) {
  const hasDelivery = input.events.some(e => e.type === "delivered");
  const hasException = input.events.some(e => e.type === "exception");
  return { status: hasException ? "exception" : hasDelivery ? "delivered" : "in_transit", podFiles: input.proofOfDelivery.length, exceptionCode: input.exceptionCode ?? null };
}

export async function reportShipment(input: unknown, client = new InfraiClient()) {
  const shipment = ShipmentRequest.parse(input);
  const decision = decideShipment(shipment);
  const payload = { name: "logistics.shipment_status", value: decision.status === "delivered" ? 1 : 0, type: "gauge", tags: { shipment_id: shipment.shipmentId, status: decision.status, pod_files: String(decision.podFiles) }, idempotency_key: `shipment-${shipment.shipmentId}` };
  const report = await metrics.report(client, payload);
  const usage = await account.usageTimeseries(client, { capability: "metrics", period: "day" });
  return { shipmentId: shipment.shipmentId, decision, report, usage };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sample = { shipmentId: "SHP-1042", events: [{ type: "delivered", at: new Date().toISOString() }], proofOfDelivery: [{ name: "signed-receipt.pdf", contentType: "application/pdf", sizeBytes: 42000 }] };
  reportShipment(sample).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error); process.exitCode = 1; });
}
