# Business Overview

> **Version:** 0.1.0 · **Audience:** business stakeholders, product owners, contact-center leads.

## 1. Business goal

Deliver a **controlled, auditable, CRM-integrated audio & video customer-service channel** for
Dynamics 365 Contact Center — not just "a video call," but a fully governed contact-center
interaction with recording, consent, compliance, routing, supervision, and reporting.

The channel gives the organization **full control** over customer entry points, media, recording
lifecycle and storage, transcription, compliance metadata, and CRM linkage — control that the
native in-chat voice/video elevation feature does not provide on its own.

## 2. Why a dedicated custom channel

| Need | Native in-chat elevation | Custom ACS channel (this solution) |
|---|---|---|
| Custom entry points (portal, public page, mobile) | Limited | ✅ Full control |
| Recording lifecycle + organization-owned storage | Limited | ✅ BYOS to your Blob |
| Compliance-grade consent logging | Banner ≠ logged consent | ✅ Logged in Dataverse |
| Transcription + AI summary control | Limited | ✅ Configurable |
| Bespoke Dataverse / case linkage | Partial | ✅ Full |
| Supervisor + reporting tailored to A/V | Native (chat/voice) | Custom-built |

**Trade-off:** the implementation team **owns** the custom channel behavior, routing/capacity
integration, supervisor features, analytics, and Microsoft supportability validation.

## 3. Representative use cases

| Use case | Why audio/video + control matters |
|---|---|
| Insurance claim inspection | Live visual capture of damage at first notice of loss; recorded evidence for the claim file. |
| Remote visual support | "See-what-I-see" troubleshooting reduces truck rolls, improves first-time-fix. |
| Damage assessment | Adjusters assess remotely with recorded, timestamped media tied to the case. |
| Identity verification | "Hold your ID to the camera" for KYC/account recovery with consented recording. |
| High-value customer service | White-glove, face-to-face-quality service for premium segments. |
| Financial / healthcare advisory | Auditable consent and recording on a HIPAA-eligible platform. |
| Technical troubleshooting | Screen share + video for complex setup/diagnosis. |
| Escalation from digital channels | Move a chat/email/case into a live, recorded video session. |
| Audit/compliance-driven video | Recorded video interaction mandated for audit, dispute, or regulatory evidence. |

**Common thread:** control over recording, storage, consent, and CRM linkage.

## 4. User roles

| Role | What they do |
|---|---|
| **Customer** | Starts an A/V session from a portal/page/app; consents; shares audio/video/screen. |
| **Agent** | Receives a workspace notification, accepts, joins the A/V session, sees case context, controls media. |
| **Supervisor** | Monitors session state, recording/consent status; (later) monitors/barges into sessions. |
| **Internal expert** | Pulled into a live session via ACS↔Teams interop for consultation. |
| **Administrator** | Configures the channel (recording, transcription, consent, routing, storage, telemetry). |
| **Compliance / auditor** | Accesses recordings, consent records, and audit logs under RBAC. |

## 5. Expected business value

- **Higher first-time resolution** and reduced field dispatch via visual support.
- **Stronger compliance posture**: logged consent, controlled recording, retention/WORM, audit trails.
- **Better customer experience** for high-trust, high-context, visual interactions.
- **Operational visibility**: KPIs for session volume, duration, abandonment, recording coverage,
  consent rate, video usage, quality, and failure rate.
- **Reuse of existing CRM context**: interactions appear on the customer/case timeline.

## 6. Success criteria (MVP)

A test customer starts a video call from a web entry point; an available agent receives a CIF
notification, accepts, sees the customer/case record, and conducts audio + video + screen-share;
recording is stored in the organization's Blob and linked to the case; consent is logged; the
session appears on the timeline.
