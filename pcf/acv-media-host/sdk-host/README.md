# Self-hosted ACS SDK bundle (`acv-acs-sdk.js`)

## Why this exists

A standard PCF code component **cannot bundle the Azure Communication Services Calling SDK**:

- The minified SDK + its deps is **~5.15 MiB**, over PCF's **hard 5 MB per-component limit**
  (`pcf-1045`, `MAX_BUNDLE_SIZE_IN_MB = 5`, enforced on production/MSBuild packaging).
- PCF **forbids code-splitting** — `pcf-scripts` forces `webpack` `LimitChunkCountPlugin({ maxChunks: 1 })`
  with the comment *"the PCF runtime cannot handle chunked bundles"*, so a dynamic `import()` is inlined
  back into the single component bundle.

So the SDK is built **here**, separately, into one standalone IIFE that the PCF loads at **runtime**
via a `<script>` tag from a configurable URL (the control's `sdkUrl` input), reading the resulting
`window.AcvAcs` global. With this split, the PCF's own `bundle.js` is ~21 KiB and packages cleanly.

## Build

```powershell
cd pcf/acv-media-host
npm run build:sdk      # webpack --config sdk-host/webpack.acs.js  ->  sdk-host/dist/acv-acs-sdk.js
```

The output (`sdk-host/dist/acv-acs-sdk.js`, ~5.15 MiB) is **git-ignored** — regenerate it with the
command above. It is fully self-contained (it bundles `@azure/communication-calling`,
`@azure/communication-common`, and `@azure/logger`), so no additional globals are required at runtime.

## Host it

Serve `acv-acs-sdk.js` from a **same-origin or allowlisted static host** and point the control at it
via the `sdkUrl` input (default: the same-origin web-resource path `/WebResources/alex_acv_acs_sdk`).

> **Size caveat (important).** The emitted file is **~5.15 MiB (5,395,621 bytes)**. The ACS Calling SDK
> ships pre-minified, so it does **not** fit under the **default Dataverse web-resource upload cap of
> 5 MiB (5,242,880 bytes)** — it is over by ~150 KB. Choose **one** of:

- **Same-origin web resource (preferred for CSP, needs an org setting):** raise the org
  `MaxUploadFileSize` (System Settings → Email → *Maximum file size*, default 5,120 KB, up to 131,072 KB),
  then upload `acv-acs-sdk.js` as a JavaScript web resource named e.g. `alex_acv_acs_sdk`. This keeps the
  default `sdkUrl` and avoids any cross-origin CSP change. *(Org-setting change — reviewer/admin decision.)*
- **Allowlisted static host (no org-setting change):** host the file on an existing approved host (e.g.
  the BYOC relay) and set the control's `sdkUrl` input / `?sdkUrl=` to that URL. If it is cross-origin,
  the Dynamics page **CSP `script-src`** must allow that host. *(CSP/allowlist decision.)*

Either way, `sdkUrl` is configurable — no host is hardcoded. No secret or tenant-specific value is
embedded in this bundle.
