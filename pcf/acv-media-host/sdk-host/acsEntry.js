// Standalone, self-hosted ACS SDK bundle for the Visual Engagement Media Host PCF.
//
// WHY THIS EXISTS:
//   A standard PCF code component CANNOT bundle the Azure Communication Services Calling SDK:
//   the minified SDK + deps is ~5.5 MiB, over PCF's hard 5 MB per-component limit (pcf-1045),
//   and PCF forbids code-splitting (pcf-scripts forces webpack maxChunks:1 — "the PCF runtime
//   cannot handle chunked bundles"). So the SDK is instead built here into ONE standalone IIFE
//   that the PCF loads at runtime via a <script> tag from a configurable URL (sdkUrl input).
//
//   This file is NOT part of the PCF bundle. It is built separately (npm run build:sdk) and the
//   resulting dist/acv-acs-sdk.js must be hosted on a same-origin / allowlisted static host and
//   pointed to by the control's sdkUrl input. Nothing tenant-specific or secret is embedded.
//
// CONTRACT: exposes window.AcvAcs with exactly the surface mediaEngine.ts consumes.
const calling = require("@azure/communication-calling");
const common = require("@azure/communication-common");

// eslint-disable-next-line no-undef
window.AcvAcs = {
  CallClient: calling.CallClient,
  LocalVideoStream: calling.LocalVideoStream,
  VideoStreamRenderer: calling.VideoStreamRenderer,
  AzureCommunicationTokenCredential: common.AzureCommunicationTokenCredential,
  getIdentifierRawId: common.getIdentifierRawId
};
