# 📑 Documentation Menu

This menu separates **Public** documentation (safe to publish to the GitHub remote)
from **Private** documentation (tenant-, environment-, and account-specific notes that
must **not** be pushed to a public remote).

> **Rule:** Public docs contain design, architecture, and generic procedures.
> Private docs contain real environment names, URLs, object IDs, resource group names,
> and any account-specific detail. **Secrets never go in either** — they live in Azure
> Key Vault / environment configuration only.

---

## 🌍 Public documentation

Generic, shareable, and safe for the public remote.

| Document | Purpose |
|---|---|
| [architecture.md](architecture.md) | End-to-end technical architecture (ACS, D365, CIF v2, PCF, Dataverse, Functions, Event Grid, Blob, monitoring). |
| [business-overview.md](business-overview.md) | Business goal, use cases, user roles, expected value. |
| [implementation-plan.md](implementation-plan.md) | Phased plan, current phase, completed work, open tasks, risks. |
| [configuration-model.md](configuration-model.md) | Dataverse configuration & metadata model design. |
| [deployment-guide.md](deployment-guide.md) | How to deploy the solution from scratch. |
| [admin-guide.md](admin-guide.md) | How an administrator configures the channel. |
| [end-user-guide.md](end-user-guide.md) | How agents and supervisors use the solution. |
| [security-and-compliance.md](security-and-compliance.md) | Identity, tokens, recording access, consent, retention, deletion, audit. |
| [known-limitations.md](known-limitations.md) | Native vs custom vs validate-with-Microsoft. |
| [access-readiness-checklist.md](access-readiness-checklist.md) | Phase 0 access matrix (generic; no secrets). |
| [adr/](adr/) | Architecture Decision Records. |

---

## 🔒 Private documentation

Environment-specific. Stored under [`private/`](private/), which is **git-ignored**
(except templates). Fill these in locally; do not push real values to a public remote.

| Document | Purpose |
|---|---|
| `private/environments.md` | Real Azure subscription, resource group, region, ACS resource, storage account, Function App, App Insights, Key Vault names. |
| `private/dynamics-environments.md` | Real Dynamics 365 environment URLs, solution names, publisher, app profiles, workstreams, queues. |
| `private/access-matrix.md` | Concrete who-has-what-access record for this engagement. |

> Templates with the same names plus `.template.md` are tracked so a new contributor
> knows what to fill in. Copy a template, drop the `.template` suffix, and fill it in locally.

---

## Documentation maintenance rules

1. Documentation is maintained **from the start**, not only at the end.
2. Every meaningful release updates `README.md`, `CHANGELOG.md`, and `implementation-plan.md`.
3. Business documentation and technical documentation are kept aligned.
4. Assumptions are never hidden — mark them explicitly.
5. Anything requiring Microsoft validation is clearly flagged as such.
