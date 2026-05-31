// Builds the MediaEngine configuration from PCF inputs, the host page URL, and relay defaults.
//
// Precedence for each value (highest first): explicit PCF input -> URL query string -> default.
// Nothing tenant-specific or secret is hardcoded: the relay host default is the public POC relay
// function host (already referenced across this repo's docs/config), and the dynamic acsGroupId is
// only ever taken from a PCF input, the URL, or a relay /api/session lookup.

import type { MediaEngineConfig, RequestedMedia } from "./types";

/** Public POC relay token endpoint default (overridable via the tokenUrl PCF input). */
const DEFAULT_TOKEN_URL = "https://func-acv-byoc-relay-vnusoc.azurewebsites.net/api/token";

/**
 * Default URL for the standalone, self-hosted ACS SDK bundle (built by `npm run build:sdk`). The
 * SDK cannot be bundled into a PCF (pcf-1045 / 5 MB limit), so it is loaded at runtime from here.
 * This is a relative, same-origin path by default — host acv-acs-sdk.js as a web resource (or any
 * allowlisted static host) and override via the sdkUrl PCF input / ?sdkUrl= query param. No secret.
 */
const DEFAULT_SDK_URL = "/WebResources/alex_acv_acs_sdk";

function coerceMedia(value: string | null | undefined): RequestedMedia | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase();
  if (v === "audio" || v === "audio-only" || v === "audioonly") return "audio";
  if (v === "audio-video" || v === "audiovideo" || v === "video" || v === "av") return "audio-video";
  return undefined;
}

function nonEmpty(value: string | null | undefined): string | undefined {
  return value && value.trim() !== "" ? value.trim() : undefined;
}

export interface PcfInputValues {
  acsGroupId?: string;
  contextId?: string;
  tokenUrl?: string;
  sdkUrl?: string;
  requestedMedia?: string;
  mode?: string;
}

/** Resolve the engine config from PCF inputs + the current page URL. Pure (search injectable). */
export function buildMediaEngineConfig(inputs: PcfInputValues, search: string): MediaEngineConfig {
  const params = new URLSearchParams(search);
  const fromUrl = (key: string): string | undefined => nonEmpty(params.get(key));

  const tokenUrl = nonEmpty(inputs.tokenUrl) ?? fromUrl("tokenUrl") ?? DEFAULT_TOKEN_URL;
  const sdkUrl = nonEmpty(inputs.sdkUrl) ?? fromUrl("sdkUrl") ?? DEFAULT_SDK_URL;
  const groupId = nonEmpty(inputs.acsGroupId) ?? fromUrl("acsGroupId") ?? "";
  const requestedMedia =
    coerceMedia(inputs.requestedMedia) ?? coerceMedia(fromUrl("requestedMedia")) ?? "audio-video";
  const mode = nonEmpty(inputs.mode) ?? fromUrl("mode") ?? "live";
  const sessionRef = fromUrl("sessionRef") ?? nonEmpty(inputs.contextId) ?? "";

  return { tokenUrl, sdkUrl, groupId, requestedMedia, mode, sessionRef };
}
