# Administrator Guide

> **Version:** 0.1.0 · **Status:** Skeleton — expands with Phases 5–10.
> Audience: Dynamics 365 / Power Platform administrators configuring the custom A/V channel.

## 1. Overview

The channel is configured through a custom **ACS A/V Channel Configuration** record
(`alex_acvchannelconfig`) in Dataverse, plus standard Unified Routing configuration. See
[configuration-model.md](configuration-model.md) for the full field reference.

## 1a. The admin setup experience (preview)

Before the Dataverse configuration above is relevant, an administrator first sets up the Azure
side. That experience is being designed up front (see [deployment-experience.md](deployment-experience.md))
so it is friendly to administrators, not only developers.

- **Deployment Assistant (HTML wizard).** A local, static page (`src/deployment-assistant/`) that
  walks you through subscription/region/resource-group/naming choices and generates a **deployment
  plan preview**: which Azure resources will be created, proposed names, **cost impact**, required
  **permissions**, the **Managed Identity / RBAC** model, an **app-settings template**, example Bicep
  parameters, manual Portal steps, and explicit **approval gates**. In this phase it is a *preview*:
  it deploys nothing and calls no APIs, and it **never stores secrets**.
- **Power Platform solutions (later).** You will import an **unmanaged** solution into a dev
  environment for customization, and a **managed** solution into test/prod. These carry the Dataverse
  schema, the CIF v2 channel provider, and app configuration.
- **What you confirm as admin:** subscription/RG/region, naming/prefix, cost acceptance, RBAC
  assignments, recording storage mode + retention, and (later) the Dynamics environment, publisher,
  and `alex` prefix.

> This section will expand with screenshots and step-by-step procedures as the real (non-preview)
> deployment path is implemented.

## 2. Configuration scope

A configuration record can be scoped to (most specific wins): **channel instance → workstream →
queue → business unit**. Create one record per distinct policy (e.g., a public anonymous entry
vs. a premium authenticated area).

## 3. Key settings (summary)

| Area | Settings |
|---|---|
| Media | Enable audio / video / screen sharing |
| Recording | Automatic vs manual, pause/resume, format, storage mode, container, retention, access policy |
| Transcription / AI | Enable, language, mode (RealTime/PostCall), AI summary |
| Consent | Require consent, consent template text |
| Routing | Default queue, routing priority, video capacity cost |
| Resilience | Fallback behavior (AudioOnly / OfferCallback / EndSession) |
| Operations | Supervisor monitoring, Teams escalation, telemetry level |
| Lifecycle | Is active, effective from/to |

> **Security:** the storage credential field stores a **Key Vault secret name**, never a SAS key.

## 4. Typical setup flow (target)

1. Confirm Azure resources exist (ACS, storage, Functions) — see deployment guide.
2. Create/import the Power Platform solution.
3. Configure CIF v2 channel provider and bind to the agent app profile (Phase 6).
4. Create a configuration record per channel/queue policy.
5. Configure the Unified Routing workstream/queue/skills (Phase 9).
6. Validate with a test session (Phase 11).

## 5. What is native vs custom

See [known-limitations.md](known-limitations.md). Admins should understand that routed-conversation,
capacity, customer summary, native supervisor tools, and native analytics are **not automatic** for
this custom channel and are approximated via the supported work-item pattern + custom components.

## 6. Detailed procedures

> To be added as components are built. Each will include screenshots and step-by-step instructions.
