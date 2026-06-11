# Requirements: web2chat v1.2 添加 web 宣传页面

**Defined:** 2026-06-01
**Core Value:** 让用户用一次点击，把"当前网页的格式化信息 + 预设 prompt"投递到指定的 IM 会话或 AI Agent 会话。

## v1 Requirements

Requirements for v1.2. Each maps to roadmap phases.

### Positioning & Messaging

- [x] **MSG-01**: Visitor can understand from the hero section that web2chat sends the current web page's structured information plus a saved prompt to an IM or AI Agent chat session. *(Phase 13 — content sources artifact with CLM-HERO-01)*
- [x] **MSG-02**: Visitor can identify the primary use cases: personal knowledge capture, team sharing, and Agent / llm-wiki workflows. *(Phase 13 — content sources artifact with CLM-USE-01)*
- [x] **MSG-03**: Visitor can understand why web2chat is different from manual copy-paste through a concise structured-payload example. *(Phase 13 — content sources artifact with CLM-PAYLOAD-01)*

### Product Proof

- [x] **PROOF-01**: Visitor can see the currently shipped platform set as OpenClaw, Discord, Slack, and Telegram. *(Phase 15 — final marketing page + platform truth verification)*
- [x] **PROOF-02**: Visitor can follow the core three-step flow: capture page, choose target, send to chat. *(Phase 15 — final marketing page + stepper verification)*
- [x] **PROOF-03**: Visitor can see credible product evidence through screenshots, diagrams, or UI mockups that are labeled with their source/version status. *(Phase 15 — labeled mockup proof modules + smoke verification)*

### Trust & Constraints

- [x] **TRUST-01**: Visitor can understand the privacy model: user-triggered capture, local-first storage, direct browser delivery to the chosen chat page, no telemetry, and no third-party analytics. *(Phase 13 — content sources artifact with CLM-PRIVACY-01)*
- [x] **TRUST-02**: Visitor can understand the production permission model without dev-only or misleading permission claims. *(Phase 13 — content sources artifact with CLM-PERM-01)*
- [x] **TRUST-03**: Visitor can distinguish shipped capabilities from known risks and deferred platforms, including Telegram live UAT and Feishu/Lark scope status. *(Phase 13 — content sources artifact with CLM-PLATFORM-01, CLM-LIMIT-01, CLM-LIMIT-02)*

### Acquisition CTA

- [x] **CTA-01**: Visitor can find the primary source repository or project entry point from the page. *(Phase 15 — hero and footer CTA wiring verified)*
- [x] **CTA-02**: Visitor can find a clear installation or availability path for Chrome / Chromium users, even if the current state is an install-from-source or release placeholder. *(Phase 15 — README 安装锚点 + verify:readme 守卫)*

### Content Operations

- [x] **OPS-01**: Maintainer can update the platform list, privacy claims, screenshots, and CTA text from explicit source sections/files without hunting through implementation details. *(Phase 13 — maintenance rules in 13-CONTENT-SOURCES.md)*
- [x] **OPS-02**: Maintainer can verify that promotional claims match `PROJECT.md`, `PRIVACY.md`, `STORE-LISTING.md`, and production `wxt.config.ts`. *(Phase 13 — verification checklist in 13-CONTENT-SOURCES.md)*

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
| MSG-01 | Phase 13, Phase 15 | Phase 15 satisfied |
| MSG-02 | Phase 13, Phase 15 | Phase 15 satisfied |
| MSG-03 | Phase 13, Phase 15 | Phase 15 satisfied |
| PROOF-01 | Phase 15 | Phase 15 satisfied |
| PROOF-02 | Phase 15 | Phase 15 satisfied |
| PROOF-03 | Phase 15, Phase 16 | Phase 15 satisfied |
| TRUST-01 | Phase 13, Phase 15, Phase 16 | Phase 15 satisfied |
| TRUST-02 | Phase 13, Phase 15, Phase 16 | Phase 15 satisfied |
| TRUST-03 | Phase 13, Phase 16 | Phase 13 done |
| CTA-01 | Phase 15 | Phase 15 satisfied |
| CTA-02 | Phase 15 | Phase 15 satisfied |
| OPS-01 | Phase 13, Phase 16 | Phase 13 done |
| OPS-02 | Phase 13, Phase 16 | Phase 13 done |
| BUILD-01 | Phase 14, Phase 16 | Pending |
| BUILD-02 | Phase 14, Phase 16 | Pending |
| BUILD-03 | Phase 14, Phase 16 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-01*
*Last updated: 2026-06-12 after Phase 15 completion*
