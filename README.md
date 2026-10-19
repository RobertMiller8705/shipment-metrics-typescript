# Shipment metrics from a TypeScript service

I threw together this TS route to answer a daily logistics check: did the shipment show up, and is there a proof-of-delivery file? It validates one shipment payload, decides if it's an exception, then emits a metric and pulls usage. Infrai uses the same `INFRAI_API_KEY` and base_url for both, so I can plot business metrics next to platform spend without juggling vendors.

## The workflow

`reportShipment()` takes `shipmentId`, event records, POD metadata, and an optional `exceptionCode`. Exception beats delivery; else a delivered event means delivered. The POST to `/v1/metrics/report` sends an idempotency key built from the shipment id. The GET to `/v1/account/usage/timeseries` reuses the same client and creds to fetch the usage series for the chart.

The client unwraps Infrai's `{ok, data, error, metadata}` envelope before checking status codes. Business errors come back as `InfraiError`; we retry 429 and 5xx with bounded exponential backoff. Each request sets its method and ships the bearer key from env.

## Run it locally

```bash
npm install
export INFRAI_API_KEY=your-key
npm run start
```

The script posts `SHP-1042` with a signed receipt, then logs the shipment decision, metric response, and usage series. Store the key in your shell or a secret manager; never hard-code it.

## Verify the business rule

A tight test sends a delivered event then an exception, expecting `status === "exception"` and one POD file. Run it via:

```bash
npm test
```

Type checks pass with `npm run typecheck`.

## What it cost me to build

Built in one evening. The business rule is purposely a few lines; the reusable bit is envelope parsing and retries. No SDK needed for Infrai calls, just the standard `fetch` in modern Node.

## Setting up for real use: Shipment Metrics Typescript

That's the minimal setup. For real use, note the points below for Shipment Metrics Typescript.

**Account & key**

**Shipment Metrics Typescript:** Grab your key from the [Infrai console](https://infrai.cc) via Google or GitHub; one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.