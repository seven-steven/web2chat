# Requirements: web2chat v1.2 添加 web 宣传页面

**Defined:** 2026-06-01
**Core Value:** 让用户用一次点击，把"当前网页的格式化信息 + 预设 prompt"投递到指定的 IM 会话或 AI Agent 会话。

## v1 Requirements

Requirements for v1.2. Each maps to roadmap phases.

### Positioning & Messaging

- [ ] **MSG-01**: Visitor can understand from the hero section that web2chat sends the current web page's structured information plus a saved prompt to an IM or AI Agent chat session.
- [ ] **MSG-02**: Visitor can identify the primary use cases: personal knowledge capture, team sharing, and Agent / llm-wiki workflows.
- [ ] **MSG-03**: Visitor can understand why web2chat is different from manual copy-paste through a concise structured-payload example.

### Product Proof

- [ ] **PROOF-01**: Visitor can see the currently shipped platform set as OpenClaw, Discord, Slack, and Telegram.
- [ ] **PROOF-02**: Visitor can follow the core three-step flow: capture page, choose target, send to chat.
- [ ] **PROOF-03**: Visitor can see credible product evidence through screenshots, diagrams, or UI mockups that are labeled with their source/version status.

### Trust & Constraints

- [ ] **TRUST-01**: Visitor can understand the privacy model: user-triggered capture, local-first storage, direct browser delivery to the chosen chat page, no telemetry, and no third-party analytics.
- [ ] **TRUST-02**: Visitor can understand the production permission model without dev-only or misleading permission claims.
- [ ] **TRUST-03**: Visitor can distinguish shipped capabilities from known risks and deferred platforms, including Telegram live UAT and Feishu/Lark scope status.

### Acquisition CTA

- [ ] **CTA-01**: Visitor can find the primary source repository or project entry point from the page.
- [ ] **CTA-02**: Visitor can find a clear installation or availability path for Chrome / Chromium users, even if the current state is an install-from-source or release placeholder.

### Content Operations

- [ ] **OPS-01**: Maintainer can update the platform list, privacy claims, screenshots, and CTA text from explicit source sections/files without hunting through implementation details.
- [ ] **OPS-02**: Maintainer can verify that promotional claims match `PROJECT.md`, `PRIVACY.md`, `STORE-LISTING.md`, and production `wxt.config.ts`.

### Build & Deploy Isolation

- [ ] **BUILD-01**: Developer can build the promotional page through a dedicated static-site command without changing the extension build output.
- [ ] **BUILD-02**: Developer can preview or smoke-test the promotional page independently from extension E2E tests.
- [ ] **BUILD-03**: Promotional page code does not import extension runtime modules such as service worker logic, storage repositories, messaging, permissions, or IM adapters.

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Website Expansion

- **WEB-01**: Visitor can browse a documentation portal with usage guides per supported platform.
- **WEB-02**: Visitor can read a changelog page generated from release notes.
- **WEB-03**: Visitor can view localized versions beyond the initial language scope.
- **WEB-04**: Visitor can access a hosted interactive demo without installing the extension.

### Product Growth

- **GROW-01**: Visitor can subscribe to updates through a privacy-preserving mechanism.
- **GROW-02**: Maintainer can publish analytics-backed conversion reports without collecting page content or extension usage data.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Modifying capture or dispatch pipeline | v1.2 is a promotional page milestone, not extension runtime work |
| Telegram live UAT closeout | Recorded as known risk only; separate verification work if prioritized later |
| Phase 11/12 Nyquist closeout | Recorded as known risk only; separate validation work if prioritized later |
| Feishu/Lark adapter revival | Dropped from shipped scope after v1.1; not part of promotion page delivery |
| Full docs portal / blog / CMS | Larger website scope; defer until the static landing page proves useful |
| Newsletter / lead capture / telemetry | Conflicts with minimal static scope and local-first trust posture |
| Server-side rendering or backend services | Static page is sufficient for v1.2 and avoids operational complexity |
| Marketing claims for unshipped platforms | Would misrepresent shipped scope and create trust risk |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MSG-01 | Phase 13, Phase 15 | Pending |
| MSG-02 | Phase 13, Phase 15 | Pending |
| MSG-03 | Phase 13, Phase 15 | Pending |
| PROOF-01 | Phase 15 | Pending |
| PROOF-02 | Phase 15 | Pending |
| PROOF-03 | Phase 15, Phase 16 | Pending |
| TRUST-01 | Phase 13, Phase 15, Phase 16 | Pending |
| TRUST-02 | Phase 13, Phase 15, Phase 16 | Pending |
| TRUST-03 | Phase 13, Phase 16 | Pending |
| CTA-01 | Phase 15 | Pending |
| CTA-02 | Phase 15 | Pending |
| OPS-01 | Phase 13, Phase 16 | Pending |
| OPS-02 | Phase 13, Phase 16 | Pending |
| BUILD-01 | Phase 14, Phase 16 | Pending |
| BUILD-02 | Phase 14, Phase 16 | Pending |
| BUILD-03 | Phase 14, Phase 16 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-01*
*Last updated: 2026-06-01 after v1.2 roadmap creation*
