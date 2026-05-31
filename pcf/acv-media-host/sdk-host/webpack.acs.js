// Webpack config that builds the standalone, self-hosted ACS SDK bundle (acsEntry.js -> dist).
// Run via: npm run build:sdk  (separate from the PCF build — this output is NOT packaged in the PCF).
//
// SIZE NOTE: the emitted file is ~5.15 MiB. The ACS Calling SDK ships pre-minified, so extra terser
// passes do not bring it under the 5 MiB (5,242,880-byte) default Dataverse web-resource upload cap.
// Hosting it therefore needs either a raised org MaxUploadFileSize OR an allowlisted static host —
// see sdk-host/README.md. The control's sdkUrl input makes that host configurable.
const path = require("path");

module.exports = {
  mode: "production",
  entry: path.resolve(__dirname, "acsEntry.js"),
  output: {
    filename: "acv-acs-sdk.js",
    path: path.resolve(__dirname, "dist")
  },
  // The SDK is large by design; this is a hosted static asset, not a PCF bundle, so no size gate.
  performance: { hints: false },
  // No source map (keeps the hosted asset to a single file).
  devtool: false
};
