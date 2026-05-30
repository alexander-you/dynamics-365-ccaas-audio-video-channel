# Security & Compliance

> **Version:** 0.1.0 · Confidence tags as in [architecture.md](architecture.md).

## 1. Identity & authentication

| Principal | Mechanism | Notes |
|---|---|---|
| Agent | Microsoft **Entra ID** + RBAC | Workspace and recording access |
| Backend (Functions/APIs) | **Managed Identity** | To ACS, Storage, Key Vault — no stored secrets |
| Customer | **Short-lived ACS tokens** (`voip` scope) | Refreshed via SDK `tokenRefresher` |

## 2. Token handling rules

- The ACS **connection string / keys are never exposed** to the browser or mobile app. **[Confirmed]**
- Tokens are **short-lived** and minted server-side by the trusted token service.
- The client receives only the token and the minimum session info needed to join.
- Token issuance is logged (operationally, without secrets).

## 3. Secrets management

- All secrets live in **Azure Key Vault**; the backend resolves them via Managed Identity.
- Dataverse and docs store only **references** (e.g., Key Vault secret names), never values.
- The repository `.gitignore` blocks `.env`, `local.settings.json`, key/cert files, and the
  private docs folder.
- **Customer-Managed Keys (CMK)** used where required.

## 4. Media & data encryption

- TLS 1.2+ for signaling; **SRTP/DTLS-SRTP (AES)** for media; **AES-256** at rest. **[Confirmed]**
- Data residency: pin the ACS resource + storage account to the chosen region; document the
  media-path caveat (ACS media path is Azure-global, encrypted, not residency-guaranteed). **[Confirmed]**

## 5. Recording access control

- Recordings written to **private** Blob containers (no public access). **[Confirmed]**
- Retrieval via **RBAC** + scoped, **time-limited** access (SAS or Managed Identity). **[Confirmed]**
- Access policy driven by `alex_accesscontrolpolicy` (AgentOnly / AgentAndSupervisor /
  ComplianceTeamOnly / Custom).
- Least privilege: write-only where possible for the recording pipeline.

## 6. Consent

- Jurisdiction-aware disclosure presented **at the entry point**, **before** any media/recording. **[Confirmed — live]**
- Explicit consent captured and persisted as an `alex_acvconsent` record **before** recording starts.
- The platform recording banner is a **notice**, not compliance-grade consent logging — consent
  logging is **custom-built**. **[Confirmed — live distinction / Assumption for the build]**

## 7. Retention & deletion

- Configurable retention (`alex_retentiondays`) via Blob lifecycle; **immutable (WORM)** where
  required for regulatory retention. **[Confirmed capability]**
- **GDPR deletion workflow** removes the Dataverse record **and** the blob **and** cleans up the
  ACS identity. **[Confirmed/Assumption]**
- Scheduled cleanup of **ephemeral (anonymous) ACS identities** via `deleteUser`. **[Confirmed]**

## 8. Auditability

- Log token issuance, recording access, and admin configuration actions. **[Assumption — must build]**
- `alex_acvevent` records provide a lifecycle/quality audit trail per session.
- Azure Monitor / Application Insights retain operational and access diagnostics.

## 9. Compliance posture

- Azure/ACS certifications: ISO 27001/27017/27018, SOC 1/2/3, HIPAA (BAA), PCI DSS, GDPR —
  **validate per feature and per region**. **[Confirmed — validate per feature]**
- PCI alignment: pause/resume recording around card entry. **[Confirmed — live]**
- **Quality Management:** whether D365 QM can consume *custom* ACS recordings is **not confirmed**
  — **[Validate with Microsoft]**.

## 10. Network

- Allow-list ACS/Azure media relay ranges; optional **ExpressRoute**. TURN/STUN relays on Azure. **[Confirmed]**

## 11. Secrets hygiene checklist (repo)

- [x] `.gitignore` blocks env/secret files and `docs/private/**`.
- [x] Private docs store references only.
- [ ] Pre-commit secret scanning (to add in a later phase).
- [ ] CI secret scanning (to add in a later phase).

## 12. IaC & deployment automation security (Phase 3b)

The Bicep scaffold under [`infra/`](../infra/README.md) and scripts under
[`scripts/`](../scripts/README.md) follow a **least-privilege, no-secrets** posture:

- **No secrets in IaC.** Key Vault is created empty; secret values are added out-of-band by an
  administrator and **never committed to Git**. App settings reference Key Vault, not raw secrets.
- **Managed Identity first.** The Function App uses a system-assigned identity; `rbac.bicep` grants
  only **Storage Blob Data Contributor** (recordings) and **Key Vault Secrets User**. ACS data-plane
  roles still require **[Validate with Microsoft]**.
- **No provisioning by automation.** Scripts only **print** `az` commands or run **read-only** local
  checks; the repo runs no `az deployment`. `dev.bicepparam` (real values) is **git-ignored**.
- **Storage hardening.** Templates set TLS 1.2 minimum, disable public blob access, and enable HTTPS
  only. Production hardening (private endpoints, CMK, immutability, lifecycle) is documented but not
  enabled in the scaffold.
- **Never commit:** subscription/tenant IDs, connection strings, ACS keys, tokens,
  `local.settings.json`, `.env.local`, or filled `*.bicepparam` files.
