import assert from "node:assert/strict";
import { decideShipment } from "../src/shipment_metrics.js";

const result = decideShipment({ shipmentId: "SHP-1", events: [{ type: "delivered", at: "2026-01-01T00:00:00Z" }, { type: "exception", at: "2026-01-02T00:00:00Z" }], proofOfDelivery: [{ name: "pod.pdf", contentType: "application/pdf", sizeBytes: 10 }], exceptionCode: "DAMAGED" });
assert.equal(result.status, "exception");
assert.equal(result.podFiles, 1);
console.log("shipment decision test passed");
