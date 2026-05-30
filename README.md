# Custom ACS-Based Audio & Video Channel for Dynamics 365 Contact Center

> **Version:** 0.1.0 — *Foundation / Phase 0–1*
> **Status:** Early scaffolding. No Azure resources provisioned yet. No Dynamics 365 components created yet.

A dedicated, custom customer-engagement **Audio & Video channel** built on **Azure Communication Services (ACS)** and integrated into **Dynamics 365 Contact Center / Customer Service workspace**.

The goal is not merely to "enable a video call," but to deliver a **controlled customer service channel** with the full operational discipline of a contact-center interaction: real-time audio/video and screen sharing, **session recording**, optional **transcription and AI summaries**, **consent capture and compliance tracking**, **case/customer linkage in Dataverse**, an **agent experience inside the Dynamics 365 workspace**, **routing and assignment**, **supervisor visibility**, and **reporting and auditability**.

---

## Architecture at a glance

```
Customer entry point (web/mobile, ACS Calling SDK)
        │
        ▼
Azure Communication Services  ──►  ACS Room / call session
        │                                   │
        ▼                                   ▼
Trusted token service (Azure Function + Managed Identity)
        │
        ▼
Routing & agent assignment (Unified Routing — validated work-item pattern)
        │
        ▼
Dynamics 365 agent workspace  ──►  CIF v2 (notification, session tab, screen-pop, presence)
        │                                   │
        ▼                                   ▼
Embedded ACS media experience (PCF / web component — the actual call controls)
        │
        ▼
Recording (ACS Call Recording, BYOS)  ──►  Azure Blob Storage
        │
        ▼
Event Grid ──► Azure Functions ──► Dataverse (session, recording, consent, telemetry, transcript)
        │
        ▼
Reporting & supervision (Dataverse dashboards, Power BI, App Insights)
```

| Layer | Responsibility |
|---|---|
| **ACS** | Audio, video, screen share, recording, transcription, call/session control |
| **CIF v2** | Dynamics workspace orchestration: notification, session tab, screen-pop, presence |
| **PCF / web component** | The actual in-workspace media UI and call controls |
| **Dataverse** | Session, consent, recording, transcript, and case-linkage metadata |
| **Azure Functions / APIs** | Lifecycle coordination across ACS, Dynamics, Dataverse, and storage |
| **Azure Blob (BYOS)** | Durable recording storage and retention |
| **Teams** | Internal expert/supervisor collaboration only — **never** the customer-facing media layer |

See [docs/architecture.md](docs/architecture.md) for the full design.

---

## Repository structure

```
.
├── README.md                     # This file
├── CHANGELOG.md                  # Versioned change log
├── VERSION                       # Current solution version (semver)
├── .gitignore
├── docs/                         # Documentation (see docs/README.md for the menu)
│   ├── README.md                 # 📑 Documentation menu (Public vs Private)
│   ├── architecture.md
│   ├── business-overview.md
│   ├── implementation-plan.md
│   ├── configuration-model.md
│   ├── deployment-guide.md
│   ├── admin-guide.md
│   ├── end-user-guide.md
│   ├── security-and-compliance.md
│   ├── known-limitations.md
│   ├── access-readiness-checklist.md
│   ├── adr/                      # Architecture Decision Records
│   └── private/                  # Tenant/environment-specific notes (git-ignored)
└── src/                          # Implementation code (added from Phase 3 onward)
```

---

## Components (planned)

| Component | Phase | Status |
|---|---|---|
| Repo & documentation foundation | 1 | ✅ In progress |
| Azure resource plan | 2 | 🔲 Documented only |
| ACS token service (Azure Function) | 3 | 🔲 Not started |
| Customer web entry point | 3 | 🔲 Not started |
| ACS Room / session lifecycle | 4 | 🔲 Not started |
| Dataverse configuration & metadata model | 5 | 🔲 Design only — needs approval |
| CIF v2 workspace integration | 6 | 🔲 Not started |
| Agent media PCF / web component | 7 | 🔲 Not started |
| Recording, transcription, compliance | 8 | 🔲 Not started |
| Routing & assignment | 9 | 🔲 Not started |
| Supervisor & reporting | 10 | 🔲 Not started |

---

## Setup & running locally

> ⚠️ There is no runnable code yet. This section will grow as components are added.
> Until then, see [docs/deployment-guide.md](docs/deployment-guide.md) for the planned setup and [docs/access-readiness-checklist.md](docs/access-readiness-checklist.md) for prerequisites.

**Prerequisites (target state):**
- Node.js 18+ and npm
- .NET 8 SDK
- Azure Functions Core Tools v4
- Azure CLI
- Power Platform CLI (`pac`)
- An Azure subscription (resources not yet created)
- A Dynamics 365 Contact Center / Customer Service environment

---

## Branching & contribution conventions

Feature branches follow `feature/<area>`:

| Branch | Purpose |
|---|---|
| `feature/acs-channel-foundation` | Repo + documentation foundation (this work) |
| `feature/token-service` | ACS token service |
| `feature/customer-entry-point` | Customer web entry point |
| `feature/session-lifecycle` | ACS Room / session lifecycle |
| `feature/dataverse-model` | Dataverse configuration & metadata model |
| `feature/d365-workspace-integration` | CIF v2 integration |
| `feature/agent-media-control` | Agent PCF / web component |
| `feature/recording-compliance` | Recording, transcription, compliance |
| `feature/routing` | Routing & assignment |
| `feature/supervisor-reporting` | Supervisor & reporting |

- Commit frequently with meaningful messages.
- Push every meaningful milestone.
- Update `CHANGELOG.md`, `VERSION`, and [docs/implementation-plan.md](docs/implementation-plan.md) for every meaningful release.

---

## Important guardrails

- **No secrets in the repository.** Tokens, connection strings, and SAS keys live in Azure Key Vault / environment configuration only. References (not values) are stored in Dataverse and `docs/private/`.
- **No Dynamics 365 changes without explicit confirmation.** Tables, columns, solutions, CIF config, and routing are created only after the user approves the environment, solution, and schema.
- **No Azure resources created without confirmation** of the target subscription and resource group.
- Native vs custom vs "validate-with-Microsoft" capabilities are tracked in [docs/known-limitations.md](docs/known-limitations.md).

---

## License & ownership

Internal solution proposal and implementation. See repository owner for licensing.
