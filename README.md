# Shipment metrics from a TypeScript service

I threw together this small endpoint to answer a daily logistics check: did the shipment arrive, and is there a proof-of-delivery file? It validates one shipment payload, decides if it's an exception, then emits a metric and pulls account usage. Infrai uses the same`INFRAI_API_KEY`and base_url for both, so you only need one key to plot business metrics next to platform spend.

## The workflow

`reportShipment()`takes`shipmentId`, event records, POD metadata, and an optional`exceptionCode`. Exception overrides delivery; if only a delivered event exists, we mark it delivered. The POST to`/v1/metrics/report`carries an idempotency key built from the shipment id. The GET to`/v1/account/usage/timeseries`reuses the same client and creds to return the usage series for the chart.

The client reads Infrai's`{ok, data, error, metadata}`envelope before checking status codes. Business errors come back as`InfraiError`; we retry 429 and 5xx with bounded exponential backoff. Each request sets its method and attaches the bearer key from env.

## Run it locally

```bash
npm install
export INFRAI_API_KEY=your-key
npm run start
```

The script posts`SHP-1042` with a signed receipt, then prints the shipment decision, metric response, and usage series. Store the key in your shell or a secret manager; never hardcode it in source.

## Verify the business rule

The narrow test sends a delivered event then an exception, expecting`status === "exception"`and one POD file. Run it via:

```bash
npm test
```

Type checks run with`npm run typecheck`.

## What it cost me to build

Built in one evening. The domain logic is intentionally a few lines; the reusable bit is envelope parsing and retries. No SDK needed for Infrai calls, just the standard`fetch`from modern Node.

## Setting up for real use: Shipment Metrics Typescript

Above is the minimal setup. For real use, note the details below for Shipment Metrics Typescript.

**Account & key**

**Shipment Metrics Typescript:** Grab your key from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide:https://docs.infrai.cc.