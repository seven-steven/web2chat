# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Documentation

- **260509-ocg:** Pre-dispatch plan for changelog体系 ([5f717f1](https://github.com/seven/web2chat/commit/5f717f15b93f7b957957fb36ec8bb675ff381d86))

## [v1.0.1] - 2026-05-09

### Bug Fixes

- **readme,tests:** Remove duplicate CWS link and stabilize Select test ([022f041](https://github.com/seven/web2chat/commit/022f041acc79fce0c1bfb287a80318bf25d52cdd))

### Documentation

- Start milestone v1.1 多渠道适配 ([493b7f7](https://github.com/seven/web2chat/commit/493b7f70d41fbcc13444885e9c1b1fc199c35c5d))

- V1.1 research — architecture analysis + platform feasibility ([814e847](https://github.com/seven/web2chat/commit/814e847dfcbb75cbf7eb2ac511ec3e77ea6b2f01))

- Define milestone v1.1 requirements (23 REQs across 5 categories) ([45262fc](https://github.com/seven/web2chat/commit/45262fc219d4ccac67ea2fa9054bdbf413e6d36c))

- Create milestone v1.1 roadmap (5 phases, 23 requirements) ([8f5065a](https://github.com/seven/web2chat/commit/8f5065aacd6fbd0b8c14e193ba4d24c0015f2280))

- **planning:** Update v1.1 FEATURES and PITFALLS research ([c2c9abf](https://github.com/seven/web2chat/commit/c2c9abf3f697a88e9e648973ce04a6abb98ae1b3))

### Tests

- **options:** Stabilize Select outside-click test ([a3c4ed9](https://github.com/seven/web2chat/commit/a3c4ed90f70136fa36267c8c79871d949e0fba87))

## [v1.0] - 2026-05-09

### Bug Fixes

- **01:** Popup loading state + e2e SW reload race (HUMAN-UAT #4) ([61046e6](https://github.com/seven/web2chat/commit/61046e6c4470483edd0c3a4097627a83a739b66a))

- **01:** Poll for new SW reference after reload (Gap-05 followup) ([2485413](https://github.com/seven/web2chat/commit/24854132276826295ab22555da22c4628362ed2a))

- **01:** Probe extension URL to actively trigger new SW (Gap-05 v3) ([e3cdd97](https://github.com/seven/web2chat/commit/e3cdd979b9b898e1428db6fcce13e47b1637e68e))

- **01:** Use CDP ServiceWorker.stopWorker instead of chrome.runtime.reload (Gap-05 v4) ([fc74cd3](https://github.com/seven/web2chat/commit/fc74cd321487baf25b43a3528964f8258bdc31b7))

- **02:** Resolve checker issues — dependency, E2E coverage, zod parse, bringToFront, label for ([973ef0b](https://github.com/seven/web2chat/commit/973ef0b1153b740d6f752baadc704d9d79d77b6d))

- **02-CR-01:** Catch sendMessage rejection in popup capture IIFE ([6de98bb](https://github.com/seven/web2chat/commit/6de98bbe5b23531167e61a49960e581e7c1988de))

- **02-CR-02:** Treat empty Readability content as EXTRACTION_EMPTY regardless of title ([42007a5](https://github.com/seven/web2chat/commit/42007a543fe177a089987db241d81cc81bdc02d8))

- **02-WR-01:** Use currentWindow:true for active-tab discovery ([9fd7098](https://github.com/seven/web2chat/commit/9fd70988ee60e779b9af2c1c48a5e860435bc221))

- **02-WR-02:** Constrain wrapHandler generic to Result<T> ([248367b](https://github.com/seven/web2chat/commit/248367be7224ca0919b5b682d9f32b8327a0dee4))

- **02-WR-03:** Validate extractor result with zod, drop unsafe cast ([7986f0d](https://github.com/seven/web2chat/commit/7986f0d8caa4ea3b8acfaea78d0dee31676b7fa9))

- **02-WR-04:** Pin runCapturePipeline directly with chrome.\* stubs ([fefcf5e](https://github.com/seven/web2chat/commit/fefcf5e9b06f8cdada2d4364e3d521d09c87ff98))

- **02-WR-05:** Cap ArticleSnapshot field lengths to prevent oversize payloads ([f3f66d3](https://github.com/seven/web2chat/commit/f3f66d3e56e49423d4132974488f8c000ffbad63))

- **02-WR-06:** Explicitly import defineContentScript from #imports ([8e2f40e](https://github.com/seven/web2chat/commit/8e2f40edb966aaf0f4a1f27c5cb21c43d178ef10))

- **02-G-1:** Flatten capture i18n keys to ASCII underscore form ([32ab18a](https://github.com/seven/web2chat/commit/32ab18a68f62edd2b8c5d2a54a23d36034a40266))

- **02-G-2:** Make E2E capture tests work without real toolbar click ([c78f207](https://github.com/seven/web2chat/commit/c78f20773ac0b176e418c111d464441566744dc4))

- **04:** Revise plans based on checker feedback ([3dea4b8](https://github.com/seven/web2chat/commit/3dea4b88b3dc53e42b3b69254561f00e77f29f9a))

- **03:** Resolve E2E failures — missing alarms permission + 3 UI bugs ([0d8802e](https://github.com/seven/web2chat/commit/0d8802e3c1e0d80827c9d138c50d888cd86dff26))

- **04-04:** Add alarms to verify-manifest expected permissions ([9829c67](https://github.com/seven/web2chat/commit/9829c6754175f08369b25823312b5eaf21dd32d5))

- **04:** Dispatch error visibility + E2E stability ([33cb41e](https://github.com/seven/web2chat/commit/33cb41e9114a68dc9cb7067615473340dfcdbbb6))

- **04:** Align OpenClaw adapter selectors + E2E with real DOM ([7a9e86c](https://github.com/seven/web2chat/commit/7a9e86c607e2491c8f1aab5aa8ec1fc00e7c4be1))

- **popup:** Use fresh capture data for title/description/content on reopen ([c263e13](https://github.com/seven/web2chat/commit/c263e13b9c19c0a9edebe1eff05ded5023c848e2))

- **e2e:** Derive WebSocket URL from OPENCLAW_URL + complete phase 04 UAT ([9a1591d](https://github.com/seven/web2chat/commit/9a1591d71fe09836aada1a536dbf9222e61cb160))

- **popup:** Restore edited title/description/content from draft on popup reopen ([7921c5e](https://github.com/seven/web2chat/commit/7921c5e1c9fd1882228d3a254077158de6b321c9))

- **options:** Pass substitution array to t() for confirm body ([8e61bb7](https://github.com/seven/web2chat/commit/8e61bb7817c4fd626c6a7ffc4af663e25d4a9e40))

- **05:** Revise plans based on checker feedback ([038be0c](https://github.com/seven/web2chat/commit/038be0c514e90fbd43ce98fae30eb9e3ebee0313))

- **05:** Revise plans based on checker feedback (iteration 2) ([3cd668e](https://github.com/seven/web2chat/commit/3cd668e377684521bf71c820be700582c63105aa))

- **05:** Update verify-manifest test fixture to include webNavigation permission ([1096bc8](https://github.com/seven/web2chat/commit/1096bc81442290b0e04ecb988279c45a590f2229))

- **05:** CR-01 add word boundary to escapeMentions regex ([d0f6399](https://github.com/seven/web2chat/commit/d0f63991a0fa0a00195c1043c579e029a022f923))

- **05:** WR-01 parameterize timestampLabel in composeDiscordMarkdown ([85e78e9](https://github.com/seven/web2chat/commit/85e78e9cc788f14b358fdd86282c0f3bbd62bae0))

- **05:** WR-02 replace stale 'mock' fallback in dispatch error path ([ee1a28d](https://github.com/seven/web2chat/commit/ee1a28dd27cd10cfa468a3f5a659e59630024ba6))

- **05:** WR-03 update docstring to list all 5 permissions including webNavigation ([0aa8ce3](https://github.com/seven/web2chat/commit/0aa8ce320e5aef8adcdf366de92bad768f1955ab))

- **05-05:** MAIN world paste bridge + official Discord SVG icon ([416c004](https://github.com/seven/web2chat/commit/416c004985a442f135e13a2770f9dd1a7b53ab6d))

- **05-05:** Add 10s sendMessage timeout with login redirect re-check ([3957dd6](https://github.com/seven/web2chat/commit/3957dd692467102497604f91ad6812e10e3438a1))

- **05:** Replace inline-script postMessage bridge with Port-based MAIN world paste ([901246f](https://github.com/seven/web2chat/commit/901246f077a7f6470782dec74c754a79d91be45c))

- **popup:** Scope draft restore of capture fields to same URL ([4f27b85](https://github.com/seven/web2chat/commit/4f27b85a3cfe9ac9f534b480d6cb6ac1f8182f74))

- **05-06:** Increase ADAPTER_RESPONSE_TIMEOUT_MS from 10s to 20s ([310f7e6](https://github.com/seven/web2chat/commit/310f7e6995e9e5e7d6bd10f807dbe1fc84d589e3))

- **05:** Replace Escape keydown with beforeinput[deleteContent] for Discord clear ([49942b3](https://github.com/seven/web2chat/commit/49942b3cc17bea7bf942a4f4ec92d55769d65188))

- **05:** Guard against duplicate listeners and fix confirmation ([6dd7e48](https://github.com/seven/web2chat/commit/6dd7e482c5e60aa1d14e13ff15f47ac959e9ccd3))

- **06-5:** Remove 3 orphaned locale keys for 100% i18n coverage ([98729f7](https://github.com/seven/web2chat/commit/98729f7b0df783c311784f03bd977e46852c97c2))

- **hooks:** Replace hardcoded macOS node path with node ([b2c804d](https://github.com/seven/web2chat/commit/b2c804d3d3c6497483d9547bdee6199530d81e7b))

- **discord:** Detect login wall rendered on channel URL ([bc0326a](https://github.com/seven/web2chat/commit/bc0326a218bb390eb69040e2215c1c6169b10eaa))

- **ci:** Drop conflicting pnpm action-setup version input ([40afb1f](https://github.com/seven/web2chat/commit/40afb1f3b0772aa4fe190df34cdf7f52731d3d8f))

- **scripts:** Guard verify-manifest CLI from running on import ([0b23bb2](https://github.com/seven/web2chat/commit/0b23bb28445bc06e3db4aba07258a3571a4b9915))

- **design:** Address review findings — reduce-motion + dropdown arrow theming ([608b7d4](https://github.com/seven/web2chat/commit/608b7d4aedcab8b5c13ab73612f34b4b631a5d4c))

- **popup:** Adaptive label column + bare URL row in CapturePreview ([c55982e](https://github.com/seven/web2chat/commit/c55982e8c0e52fe2537f178c79947d0b4699bae3))

- **options:** Compact settings layout — tighter padding, smaller type ([1fb47c4](https://github.com/seven/web2chat/commit/1fb47c4c45325a33c4941dbbe42091918048faf8))

- **options:** Language dropdown click penetration from stacking context ([dd57752](https://github.com/seven/web2chat/commit/dd577526ef5d516a15640f8b673fc8cc4652d0a5))

- **test:** Yield extra tick for useEffect flush in outside-click test ([596d644](https://github.com/seven/web2chat/commit/596d6445d08c51f9ed42e2108ebe24ff57a8fb57))

### Chores

- Add project config .planning/config.json ([bdce8ab](https://github.com/seven/web2chat/commit/bdce8ab569714a13294add9060a4cbd5d8027e75))

- **01-1:** Wire ESLint flat config + Husky + lint-staged (D-12) ([ad1a98d](https://github.com/seven/web2chat/commit/ad1a98d07ee44c084e98bf8aad4e74ad2532ab1b))

- **02-07:** 添加 fixture HTML + 配置 playwright webServer ([5b82349](https://github.com/seven/web2chat/commit/5b82349be29c97c7a6089a3e36054c77e80635fb))

- Merge executor worktree (worktree-agent-a97d03e025cc48e55) ([30a5211](https://github.com/seven/web2chat/commit/30a521146e2dc1297bce128ae12494717c81c4bf))

- **gsd:** Upgrade GSD workflow framework to latest version ([cb25191](https://github.com/seven/web2chat/commit/cb25191b71a5a764776ec6a47eae9a971f7f436b))

- **06-5:** Add test:i18n-coverage script to package.json ([8edf394](https://github.com/seven/web2chat/commit/8edf39451accfaf2c742c21c5944816aff891164))

- Merge executor worktree (07-01 verification tooling) ([99fc9f6](https://github.com/seven/web2chat/commit/99fc9f6441cabeeab10c154a454593a19033b8d3))

- Merge executor worktree (07-04 store listing) ([26ae8b6](https://github.com/seven/web2chat/commit/26ae8b6cdbc11b70116f4c43f6786fb3c56f3b5d))

- **ci:** Upgrade actions to Node 24 compatible majors ([5e65220](https://github.com/seven/web2chat/commit/5e6522054d1dfac24abd82953949dd0d67ff5d5b))

- **build:** Exclude non-source dirs from Tailwind scan and enable esbuild CSS minify ([8d91eb8](https://github.com/seven/web2chat/commit/8d91eb87495cf2af267c8608ffb2797a43ae1e7c))

- **assets:** Add CWS store listing HTML templates ([0fa3e33](https://github.com/seven/web2chat/commit/0fa3e33f74842bdf898104a713f79c29aad450fc))

- **assets:** Add pnpm script to regenerate store listing screenshots ([ae1966a](https://github.com/seven/web2chat/commit/ae1966a45a0257059eb90164632604d7f87a00ed))

- **gsd:** Enable stricter workflow settings ([e06eadf](https://github.com/seven/web2chat/commit/e06eadfaa664bbbd2b72f244bb4a15f040e8fc09))

- Archive v1.0 milestone ([32b6c15](https://github.com/seven/web2chat/commit/32b6c15e546651c843804939dab0d7b548e38490))

- Remove REQUIREMENTS.md — archived to milestones/v1.0-REQUIREMENTS.md ([e734422](https://github.com/seven/web2chat/commit/e7344228b5723103b35c2fa67979c75d2172dbd2))

- Archive v1.0 phase directories to milestones/v1.0-phases/ ([ae56193](https://github.com/seven/web2chat/commit/ae5619318403bd20550022f9811dac1cb34464a9))

### Documentation

- Initialize project .planning/PROJECT.md ([5d01012](https://github.com/seven/web2chat/commit/5d010124373575cddd51192e0f31d62f0d81be50))

- **research:** Stack/features/architecture/pitfalls .planning/research/STACK.md .planning/research/FEATURES.md .planning/research/ARCHITECTURE.md .planning/research/PITFALLS.md ([9b6fdd3](https://github.com/seven/web2chat/commit/9b6fdd387c0eb72bdd44ce5c4e330219d867b779))

- **research:** Synthesize SUMMARY .planning/research/SUMMARY.md ([7999f62](https://github.com/seven/web2chat/commit/7999f6218441541d1c22672ac94d8274339f7db8))

- Define v1 requirements .planning/REQUIREMENTS.md ([d522a33](https://github.com/seven/web2chat/commit/d522a337440f1262015166ca55a670f73dd95105))

- Create roadmap (7 phases) .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md ([1ff9563](https://github.com/seven/web2chat/commit/1ff9563dda0e0b1fbba03ec44099d48a9a5c039c))

- Generate CLAUDE.md project guide ([ba588a0](https://github.com/seven/web2chat/commit/ba588a0eb65984787c7a3e0128677a37cafe82e9))

- Translate ROADMAP to zh_CN .planning/ROADMAP.md ([4e6d610](https://github.com/seven/web2chat/commit/4e6d610c2c29bfd5924e7482746bcc2da0cd46f7))

- **research:** Translate SUMMARY to zh_CN .planning/research/SUMMARY.md ([dba5d40](https://github.com/seven/web2chat/commit/dba5d40338ca9b19e2254062de2c1a4091fe9fb3))

- **research:** Translate STACK to zh_CN .planning/research/STACK.md ([bdc8ada](https://github.com/seven/web2chat/commit/bdc8ada339a14106502d2d32f998da3637ae3a53))

- **research:** Translate ARCHITECTURE to zh_CN .planning/research/ARCHITECTURE.md ([a23d54f](https://github.com/seven/web2chat/commit/a23d54f35bd56dbb079253d7c1a8bb20654db5a0))

- Localize CLAUDE/PROJECT/STATE/REQUIREMENTS to zh_CN ([740e8e4](https://github.com/seven/web2chat/commit/740e8e4dab4137c71e7fc5e3403b45bfea15a543))

- **research:** Translate FEATURES to zh_CN .planning/research/FEATURES.md ([182fc1d](https://github.com/seven/web2chat/commit/182fc1d61c0498a305fd5013dfc5dbc0eff55034))

- **research:** Translate PITFALLS to zh_CN .planning/research/PITFALLS.md ([529197e](https://github.com/seven/web2chat/commit/529197e22362053c27986d3a6d99ad36853de683))

- Switch OpenClaw to optional_host_permissions runtime grant ([f3b5a1f](https://github.com/seven/web2chat/commit/f3b5a1fde746be5af3ba56c6d718f5759cd58057))

- **01:** Capture phase 1 context ([f3b90ec](https://github.com/seven/web2chat/commit/f3b90ec927d7a0455b65af75cef3a674359158e4))

- **01:** Create phase plan ([d89a599](https://github.com/seven/web2chat/commit/d89a5995ab42ff9e0bd522ea7f75e8cb34780169))

- **01-1:** Complete scaffold plan ([51729a8](https://github.com/seven/web2chat/commit/51729a82eac66fb36b52c4ab36428fdb2143930d))

- Add developer behavioral profile to CLAUDE.md and USER-PROFILE.md ([5586182](https://github.com/seven/web2chat/commit/558618270dd5c53eb20143ac8caba3e7baa952ae))

- **01-2:** Complete Plan 01-2 summary + update state/roadmap ([d88ac37](https://github.com/seven/web2chat/commit/d88ac3777e9a34cc835c52098bff44eac4bba71a))

- **01-3:** Complete Plan 01-3 summary + update state/roadmap/requirements ([0bdc0fb](https://github.com/seven/web2chat/commit/0bdc0fb27f65b3b9e0232a701f335641375c299c))

- **01-4:** README — Phase 1 dev section + 5 manual smoke scripts ([7db2f08](https://github.com/seven/web2chat/commit/7db2f08d3ef81e923917749bd85627af1137b60a))

- **01-4:** Complete Plan 01-4 summary + update state/roadmap/requirements ([4808377](https://github.com/seven/web2chat/commit/4808377babdc74c6b243d5fa807fab7614f4db42))

- **01:** Add code review report ([b534f4b](https://github.com/seven/web2chat/commit/b534f4b69704e3769db96ba1006896ca9f08f109))

- **01:** Add phase verification + human-UAT ([722d51c](https://github.com/seven/web2chat/commit/722d51c5e69ae95b31b2ff891cd00d17a3f699f5))

- **01:** Fix SW-Stop verification path + clarify e2e binary install ([dd1d336](https://github.com/seven/web2chat/commit/dd1d33608e718269f989ea78a73f22ba650477c2))

- **01:** Record Gap-04/05 resolution + #1 verified ([09b6fcb](https://github.com/seven/web2chat/commit/09b6fcb328c175f629a445c277fd6e5b15a21cf3))

- **phase-01:** Complete phase execution ([04fb32e](https://github.com/seven/web2chat/commit/04fb32ead5990f89eabef6048c7a97a28bf42ebb))

- **01:** Record Gap-05 v2 + e2e re-run 2 progress ([5009b7b](https://github.com/seven/web2chat/commit/5009b7b34df0be3ab5f2a4d99ace1404e7f5337f))

- **01:** Close HUMAN-UAT #4 — 3/3 e2e green via CDP stopWorker (Gap-05 v4) ([023b86b](https://github.com/seven/web2chat/commit/023b86bb0f07f1cbf77d35441c6d9f9cc8541c93))

- **01:** Finalize STATE — Phase 1 100% verified after Gap-05 v4 ([64a6af7](https://github.com/seven/web2chat/commit/64a6af70cd79fa11021c165bea9c403c66043d96))

- **02:** Capture phase context ([00d8902](https://github.com/seven/web2chat/commit/00d89027b2a616056a3dafaf7fd2622822b21ad0))

- **state:** Record phase 2 context session ([cb21ac6](https://github.com/seven/web2chat/commit/cb21ac681b63adfa4db0dbe26f745f3adafb77b9))

- **02:** UI design contract for capture popup ([f9ecb79](https://github.com/seven/web2chat/commit/f9ecb79e83998406c6675487e9d3ea665b2b3592))

- **02:** UI-SPEC revision — typography 2 weights, spacing px-3, i18n key split .planning/phases/02-capture/02-UI-SPEC.md ([9f92f85](https://github.com/seven/web2chat/commit/9f92f85fca6c56695cfa3bb09df079ae0a885607))

- **state:** Record Phase 2 UI-SPEC closure .planning/STATE.md ([c2877af](https://github.com/seven/web2chat/commit/c2877afb82c327ba5e61273872af21e9ece87a84))

- **02:** Research phase — capture pipeline implementation findings ([e1b040d](https://github.com/seven/web2chat/commit/e1b040dbc008cfb975f1462c04bc84f900a4ee26))

- **02:** Create phase 2 capture pipeline plans (7 plans, 5 waves) ([a9f21c2](https://github.com/seven/web2chat/commit/a9f21c2edf3a7a972a0b2dafc5a18d89b903fff6))

- **02:** 创建 Phase 2 计划 — 7 个 plan，6 waves，覆盖 CAP-01..05 ([1f089ab](https://github.com/seven/web2chat/commit/1f089ab9126f8ba4f0e7bf433d04a0b516487123))

- Cross-AI review for phase 2 (claude-sonnet-4-6) ([40e193c](https://github.com/seven/web2chat/commit/40e193cb5647e357d72d5eed36f489c588746c03))

- **02:** Strengthen plans — type stubs, safeParse, deterministic E2E ([63857c9](https://github.com/seven/web2chat/commit/63857c9c5d6a5871b9773a934a403946ed20327a))

- **02-01:** 创建 Wave 1 依赖安装完成摘要 ([0211e38](https://github.com/seven/web2chat/commit/0211e38babe7df81fb1e1441c23050e1f540231c))

- **02-02:** 创建消息协议扩展完成摘要 ([883cad8](https://github.com/seven/web2chat/commit/883cad8e45e7073ab254ec80c660a6c815f3a223))

- **02-03:** 创建 extractor plan 完成摘要 + 推进 STATE/ROADMAP ([90a2d14](https://github.com/seven/web2chat/commit/90a2d14f0bb1a580ec280a472a2912e25c009e7a))

- **claude-md:** 添加用户约束节 — 语言与测试执行规则 ([de41d78](https://github.com/seven/web2chat/commit/de41d78d49e51162167b4b949956781840699756))

- **02-04:** 创建抓取流水线单元测试 plan 完成摘要 + 推进 STATE/ROADMAP/REQUIREMENTS ([12c253f](https://github.com/seven/web2chat/commit/12c253fcdce737ea51ccb9a4a2798f7fa7e3289c))

- **02-05:** 创建 SW capture-pipeline plan 完成摘要 + 推进 STATE/ROADMAP/REQUIREMENTS ([47906e0](https://github.com/seven/web2chat/commit/47906e002aa01c725e842c39118f1443225b0ac3))

- **02-06:** 创建 popup 4-state capture UI plan 完成摘要 + 推进 STATE/ROADMAP/REQUIREMENTS ([6ab3f23](https://github.com/seven/web2chat/commit/6ab3f23e88983c6bc7fee0ec9931c01ff3ecd160))

- **02-07:** 创建 E2E capture 测试 plan 完成摘要 + 推进 STATE/ROADMAP ([4be90cf](https://github.com/seven/web2chat/commit/4be90cf4ac5e4ad76c99404d2f15744e981619c7))

- **02:** 添加 Phase 2 code review 报告 ([613758a](https://github.com/seven/web2chat/commit/613758a6dcbfbb75a5bcbf1cdf10b1946a3e6bd8))

- **02:** 添加 code review fix 报告 ([14e0032](https://github.com/seven/web2chat/commit/14e0032aa83d4295268f2b3bde36a784db5b8fe3))

- **02:** G-1 closure — re-verify status human_needed (5/5 must-haves) ([d5ebf3c](https://github.com/seven/web2chat/commit/d5ebf3c1e7076002789835ea14e47df45a61f9ff))

- **02:** Record G-2 closure + E2E 3/3 pass — only visual UAT remains ([2c941c5](https://github.com/seven/web2chat/commit/2c941c50c56e7adc873567f3adc62ff26a379526))

- **phase-02:** Mark Phase 2 complete (UAT 5/5 passed) .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md .planning/phases/02-capture/02-VERIFICATION.md ([993137c](https://github.com/seven/web2chat/commit/993137c17dede1b99b2d73c5e58155653242003d))

- **phase-02:** Evolve PROJECT.md after phase completion ([7a9113b](https://github.com/seven/web2chat/commit/7a9113b9044854c1071f870cad744d6189d4f53d))

- **03:** Capture phase context ([c9bfad9](https://github.com/seven/web2chat/commit/c9bfad9bb9893e48348f07f58951f46e91a804ff))

- **state:** Record phase 3 context session ([a086eab](https://github.com/seven/web2chat/commit/a086eab37750c4ff7bd081f5554b74fcb208b3a9))

- **03:** Phase 3 research — dispatch + popup combobox ([7fdd41a](https://github.com/seven/web2chat/commit/7fdd41a30135805a3ebc052d5757b831a91d0df3))

- **03:** Add validation strategy ([dc622de](https://github.com/seven/web2chat/commit/dc622dec6f4251b3d8fa758e52282ae4c8d827da))

- **03:** UI design contract ([567b0b1](https://github.com/seven/web2chat/commit/567b0b18f88503918d0380209d48fe2ff280e08d))

- **03:** Tighten UI-SPEC spacing scale + visual hierarchy ([985bd8f](https://github.com/seven/web2chat/commit/985bd8fa727f35bbff6706c157f0c21e15596875))

- **03:** Mark UI-SPEC approved after checker verification ([73c8d3b](https://github.com/seven/web2chat/commit/73c8d3b0f0f2e85bdc9142dd97eca0fb1530c53f))

- **state:** Record phase 3 ui-phase session ([d9785eb](https://github.com/seven/web2chat/commit/d9785ebb0a506cc4305a748222d976c29c1cdda2))

- **03:** Create phase plan — 8 plans / 4 waves ([8b2dfd7](https://github.com/seven/web2chat/commit/8b2dfd7696ad4031fec1a876e9a1f42735409a69))

- **03:** Revise plans after checker iteration 1 — 4 BLOCKERs resolved ([eb3be4a](https://github.com/seven/web2chat/commit/eb3be4ab405c3cf205dfe6174d8d04850e75a823))

- **03:** Add 03-01 + 03-02 summaries ([7077696](https://github.com/seven/web2chat/commit/7077696d2439249ca4b2bdec2c3fb4339ea5bd72))

- **03-03:** Complete manifest config plan summary ([77191bb](https://github.com/seven/web2chat/commit/77191bbdeb73e9b5e48306a22506773405e82625))

- **03:** Mark Phase 3 execution complete — 8/8 plans, 109 tests, E2E pending ([3034beb](https://github.com/seven/web2chat/commit/3034bebe65a197f7cfa4b6b4e260f6fddd2867b6))

- **04:** Capture phase context for OpenClaw adapter ([47143c1](https://github.com/seven/web2chat/commit/47143c171f59c0fa1bfe1644674bc0ca745023bd))

- **state:** Record phase 4 context session ([52b1e07](https://github.com/seven/web2chat/commit/52b1e07ee135619ec86af31fa8c3e80aee2abb35))

- **04:** Research phase domain — OpenClaw adapter ([2fc3f27](https://github.com/seven/web2chat/commit/2fc3f27399c770424e097c356a91c7d5b1cf8e65))

- **04:** Create phase 4 OpenClaw adapter plans (4 plans, 3 waves) ([afb3988](https://github.com/seven/web2chat/commit/afb3988f964ee072be5bb8055fb5708326208c6a))

- **04:** Create phase plan — 4 plans in 4 waves ([9aa7ba6](https://github.com/seven/web2chat/commit/9aa7ba64e3407b3c24b65cbc9c04fd01f7c386d1))

- **04-01:** Complete Phase 4 foundation plan ([938ded8](https://github.com/seven/web2chat/commit/938ded89c70c9b8709bf019b5b5b254b4dfa5106))

- **04-02:** Complete OpenClaw adapter plan ([adf7023](https://github.com/seven/web2chat/commit/adf70234278f14999f3897943080f6308ba20bd8))

- **04-02:** Complete OpenClaw adapter content script plan ([e697d89](https://github.com/seven/web2chat/commit/e697d89a18c3271f3c2434eca896dca3ba5b8070))

- **04-03:** Complete permission UX flow plan ([ab510c0](https://github.com/seven/web2chat/commit/ab510c01da096859f2cd2b0959def68fc31a0184))

- **04-04:** Complete E2E + verification plan ([9b8bc42](https://github.com/seven/web2chat/commit/9b8bc42fa4629e1273bf6bee81fa5581e915987a))

- **state:** Record Phase 4 execution complete — 4/4 plans, 152 tests ([51eed34](https://github.com/seven/web2chat/commit/51eed34e9c2cd535b99127f0d9487e276d16e71d))

- **04:** Gap closure plans — fix popup-close-on-permission-dialog (UAT 5/6/7/10) ([a7b5a34](https://github.com/seven/web2chat/commit/a7b5a34b0d942361d2c74cf674d83876612c57cd))

- **04-05:** Complete gap closure — popup close fix on permission dialog ([67f501c](https://github.com/seven/web2chat/commit/67f501c5029fccfc4d27721baf3a9671370b36a5))

- **04-06:** Complete E2E spec popup-close alignment — specs verified correct at base ([965e7d4](https://github.com/seven/web2chat/commit/965e7d4cb8653ce7d7f89873f857eaac89ae051d))

- **phase-04:** Update tracking after gap closure — 6/6 plans complete ([2961c98](https://github.com/seven/web2chat/commit/2961c98acb551ecbd252491ea396413503f43a26))

- **04:** UI audit review ([68a2a35](https://github.com/seven/web2chat/commit/68a2a354bbe92f99aaf75a33c76e55cb47f0a28f))

- **05:** Capture phase context ([36666b5](https://github.com/seven/web2chat/commit/36666b51bb59a6a34a7cd5d1c3da86599e4d2027))

- **state:** Record phase 5 context session ([b346132](https://github.com/seven/web2chat/commit/b346132cb28c3dedb38eee87f67fcb097854c285))

- **05:** Research Discord adapter domain ([ce090cc](https://github.com/seven/web2chat/commit/ce090cc0bb2b80a1d6dd725977854f29a9b132f0))

- **05:** Add validation strategy ([ecc84d8](https://github.com/seven/web2chat/commit/ecc84d82e2d79cadaf7ac581138d309cb258ecda))

- **05:** Create phase 5 plans for Discord adapter ([ae56784](https://github.com/seven/web2chat/commit/ae567843def71075a3e097a19acc7afb90f00ab5))

- **05:** Create phase plan ([830fb3a](https://github.com/seven/web2chat/commit/830fb3a1409e58be4f9637eb47a8f46cc3e1d969))

- **05-01:** Complete Discord format + registry plan summary ([272555d](https://github.com/seven/web2chat/commit/272555dfa20788e68fcdea2862b6faa541a47221))

- **05-02:** Complete Discord adapter content script plan summary ([2b22bfb](https://github.com/seven/web2chat/commit/2b22bfbec1e6ca3e81be64b292cb09453b4cd11c))

- **05-03:** Complete Discord integration wiring plan ([c700ce9](https://github.com/seven/web2chat/commit/c700ce9d4747dbbd8edbdd75a89a45d60e1d1684))

- **05-04:** Complete Discord E2E tests plan summary ([4ccf227](https://github.com/seven/web2chat/commit/4ccf227bbd3cb6e86c755eeefc0d3233d538ac5c))

- **05-04:** Update state, roadmap, requirements for Phase 5 completion ([b39bf1f](https://github.com/seven/web2chat/commit/b39bf1fd7183f6cf3c4fac33b1bb014cb819e50d))

- **05:** Add code review report ([d67e833](https://github.com/seven/web2chat/commit/d67e833bf0265faa113a1916c76229ab698a84fd))

- **05:** Add code review fix report ([0124ef8](https://github.com/seven/web2chat/commit/0124ef88d61620516a29e6d4705b3f696b736689))

- **05:** Create gap closure plan for UAT failures ([33670fb](https://github.com/seven/web2chat/commit/33670fb25998b38073b9fb6ffb352dd2a92b5f80))

- **05-05:** Complete Discord UAT gap closure plan ([c5e4d32](https://github.com/seven/web2chat/commit/c5e4d3281e8eb2749833943033d3e003a31adc2d))

- **05-05:** Add UAT debug session notes ([8b51c92](https://github.com/seven/web2chat/commit/8b51c92e1ad7f7697aada818a75608751dc144ef))

- **05:** Add gap closure plan 05-06 (editor clear + timeout fix) ([be337f3](https://github.com/seven/web2chat/commit/be337f3e20a7a0ae88a1c0904971a9b6cad87078))

- **05:** Diagnose UAT re-verification gaps + create gap closure plan 05-06 ([cb2c228](https://github.com/seven/web2chat/commit/cb2c228e7d220f2622c08be0e27a46cb77f967d9))

- **05-06:** Complete Discord gap closure plan — Escape clear + 20s timeout ([8e1eb06](https://github.com/seven/web2chat/commit/8e1eb064aa0c648e2a39ae59e6fcc2377a554506))

- **05:** Update UAT gap status after 05-06 gap closure ([9564a87](https://github.com/seven/web2chat/commit/9564a87389624e5afe3c42a2c52e66ce131d8a78))

- **05:** Update STATE.md — Phase 5 verified (human_needed) ([6dd1004](https://github.com/seven/web2chat/commit/6dd1004e314766ce59baa8f65e49767e9c0fd67d))

- **05:** Add Discord debug session notes for resolved UAT gaps ([d20c736](https://github.com/seven/web2chat/commit/d20c7369ab7d3d60bdb8a5cb71265a16d9af8237))

- **debug:** Resolve Discord UAT regression debug sessions ([0e28d84](https://github.com/seven/web2chat/commit/0e28d84cbb403a55560f9239fcbee146b3b37a85))

- **06:** Capture phase context ([4e5e9ad](https://github.com/seven/web2chat/commit/4e5e9ad3676e71c18fab52e705835d230eb225b7))

- **state:** Record phase 6 context session ([593cfe1](https://github.com/seven/web2chat/commit/593cfe193b8eebcabf79a67f977b533ef8a70d4c))

- **06:** UI design contract for i18n hardening phase ([d6dd5d7](https://github.com/seven/web2chat/commit/d6dd5d7d9b36ef143d80210cea2f4ea46a8f9eba))

- **06:** UI design contract ([c71148e](https://github.com/seven/web2chat/commit/c71148e005cb383d51a656d0ed1d606451b0dbdb))

- **state:** Record phase 6 UI-SPEC session ([a78a9bf](https://github.com/seven/web2chat/commit/a78a9bf1dba1e615711276b70e73b92325aae904))

- **06:** Create phase plan ([47d9197](https://github.com/seven/web2chat/commit/47d91975368f3701fbffd28d4736feec5f73d8fd))

- **06:** Research phase i18n domain ([e2b7449](https://github.com/seven/web2chat/commit/e2b74495b4058b51483a08373c9ee1f3f76e1363))

- **06:** Finalize i18n phase plans — split 06-1 into 06-1a/1b, add validation ([1fb92e2](https://github.com/seven/web2chat/commit/1fb92e2ea2380fb4789c9517c10195b208d811cd))

- **06-1a:** Complete i18n infra plan summary ([01fb04a](https://github.com/seven/web2chat/commit/01fb04a060c101ce09b1143e6fa5195197995f77))

- **06-1b:** Complete async locale init plan summary ([5e7d6b5](https://github.com/seven/web2chat/commit/5e7d6b58dd31d9e9c1ea81132c85369a001831ed))

- **06-3:** Complete manifest i18n verification plan summary ([8dccde1](https://github.com/seven/web2chat/commit/8dccde17932a8ea4805dc2eb6ca375bd152913ed))

- **06-2:** Complete eslint hardcoded-string rule plan summary ([3995e84](https://github.com/seven/web2chat/commit/3995e843d9ec4e493d90ba926f5ff8106ced3411))

- **06-4:** Complete LanguageSection UI + locale file update plan ([95745a7](https://github.com/seven/web2chat/commit/95745a7a6890feea2c2dafc5c8ae3df7b9fb714b))

- **06-5:** Complete i18n coverage audit plan summary ([7817f98](https://github.com/seven/web2chat/commit/7817f98b0e76cb8b9ff875650ea3a0985c21faf5))

- **06:** Phase verification — 4/4 must-haves verified, 3 human tests pending ([cb939e7](https://github.com/seven/web2chat/commit/cb939e71286ed965fcb166c72f835516e34458db))

- **phase-6:** Complete phase execution ([720cf1a](https://github.com/seven/web2chat/commit/720cf1a39df405ece707e78075371900caa8d47e))

- **07:** Capture phase context ([4ccef69](https://github.com/seven/web2chat/commit/4ccef69f58e6ee8d0d8f90cdbcc1153a13dfbb70))

- **state:** Record phase 7 context session ([e9effdf](https://github.com/seven/web2chat/commit/e9effdf76f4306cfab3566fb537f18c152111b08))

- **07:** Research phase domain — CWS packaging, privacy policy, store listing ([c4574c5](https://github.com/seven/web2chat/commit/c4574c5df8bb384e3d5c0f7109b2615da9794bc2))

- **07:** Create phase 7 distribution plans ([ca75152](https://github.com/seven/web2chat/commit/ca751527a87f66edb43fea71839f1e0ab19c9bb0))

- **07:** Create phase plan — 4 plans in 1 wave ([cd002a6](https://github.com/seven/web2chat/commit/cd002a68c256c67ddf6551075ca852854522cbe4))

- **07-02:** Add English privacy policy (PRIVACY.md) ([ecdafc0](https://github.com/seven/web2chat/commit/ecdafc0bf3e280a0dd0807d2c22c8d78256e8010))

- **07-01:** Complete distribution verification tooling plan ([9e642ac](https://github.com/seven/web2chat/commit/9e642ac532ff937b92939f6fd030288b77ec71bc))

- **07-04:** Create bilingual CWS store listing copy ([2f2809f](https://github.com/seven/web2chat/commit/2f2809f5cd031a71dcfce2769163e80296df0d1c))

- **07-04:** Complete CWS store listing copy plan ([9a4c75e](https://github.com/seven/web2chat/commit/9a4c75e7f24173f94a1b64b87b9c36036d1f8fd3))

- **07-04:** Add self-check results to SUMMARY ([3d7564e](https://github.com/seven/web2chat/commit/3d7564e4325537a3a7b65dfebe32347477662470))

- **07-02:** Add PRIVACY.zh_CN.md with cross-link headers ([0b528bd](https://github.com/seven/web2chat/commit/0b528bd601adfb8567e04d6da982fcb4a1a5f1d1))

- **07-02:** Complete privacy policy plan with SUMMARY and state updates ([f0ebd6b](https://github.com/seven/web2chat/commit/f0ebd6b80a8c84513d909bbe82a4dd8e4269a108))

- **07-03:** Rewrite README.md as zh_CN user-facing document ([e02b00d](https://github.com/seven/web2chat/commit/e02b00d7f18d556c0b6a5a558dc743052ffd3b18))

- **07-03:** Create README.en.md as English user-facing document ([ceafc71](https://github.com/seven/web2chat/commit/ceafc71a2d6b962fb65be14e6ae28f30d50f5d4a))

- **07-03:** Complete bilingual README plan with SUMMARY and state updates ([71a28dd](https://github.com/seven/web2chat/commit/71a28dd7adc1d65b99f80b03750522ddd28cd191))

- **07:** Add code review report ([4741ca3](https://github.com/seven/web2chat/commit/4741ca333a54962157a08b53a81da82ba3ee0af7))

- **07:** Add phase verification report ([e24ad6f](https://github.com/seven/web2chat/commit/e24ad6f6ffae07b6d5f6a7608d6bb6da3d572138))

- **phase-07:** Complete phase execution — v1.0 milestone done ([1790817](https://github.com/seven/web2chat/commit/1790817ebc4f8da330df87e1f397202a217aef2c))

- **06:** Mark Phase 6 UAT complete — 6/6 passed ([399ff1a](https://github.com/seven/web2chat/commit/399ff1a0c004c01f5d3552aec881a68e46aabe5c))

- **07:** Mark Phase 7 UAT complete — v1.0 milestone done ([952f069](https://github.com/seven/web2chat/commit/952f0699ea6166176e608b97bc3e501b82893182))

- **03:** Record dispatch popup UAT results — 8/8 passed ([4c828d1](https://github.com/seven/web2chat/commit/4c828d195dab52c5ebdba5d60e8192a5c32c7bc5))

- **uat:** Close phase 05 and 06 UAT items — all green ([e974e25](https://github.com/seven/web2chat/commit/e974e257130cffa5a035d8bf51af43ee1b07fd7f))

- **uat:** Close phase 04 + 05 outstanding UAT items ([1f96360](https://github.com/seven/web2chat/commit/1f963608774ce442d0066b714017a03b3fed803c))

- **quick-260507-n86:** 使用 frontend-design 优化项目现有 UI ([c7f648c](https://github.com/seven/web2chat/commit/c7f648c92e6dcb0473919e459d0d13afa0a30ae6))

- **design:** Sync DESIGN.md with current implementation ([17e5fb1](https://github.com/seven/web2chat/commit/17e5fb15754b7b1fec04f5e576353c61a54e5617))

- Add llm-wiki design intent and normalize project name to lowercase web2chat ([0836be3](https://github.com/seven/web2chat/commit/0836be3228f8953abc44bb49e2a96a14976326ea))

- **readme:** Add Chrome Web Store link ([8f0a765](https://github.com/seven/web2chat/commit/8f0a765e112b4ee65292f05f2e4efa4f8f951eff))

### Features

- **01-1:** Bootstrap WXT 0.20.x scaffold + manifest shape (FND-01, FND-05) ([263ed18](https://github.com/seven/web2chat/commit/263ed1856052df6d045158b51c8ece2c4d3fefbf))

- **01-2:** Add storage schema + migration framework + i18n facade ([bde6b37](https://github.com/seven/web2chat/commit/bde6b37beea22c4f5084097d62c6e3c9b16fb5f5))

- **01-3:** Add typed RPC protocol + Result/ErrorCode (D-05/06/07) ([0f96cf5](https://github.com/seven/web2chat/commit/0f96cf551aefddce5c481ebb70090825fd78ef04))

- **01-3:** Wire SW background entrypoint with meta.bumpHello handler ([b41408c](https://github.com/seven/web2chat/commit/b41408cdc139adc7e8dbebd451111b511fa69906))

- **01-4:** Popup entrypoint (Preact + Tailwind v4 + signals + auto RPC) ([dc55bcb](https://github.com/seven/web2chat/commit/dc55bcbe962d17e4795ad567028215f83b26ebc4))

- **02-01:** 安装抓取流水线运行时依赖 ([9eb7c2c](https://github.com/seven/web2chat/commit/9eb7c2c1765f487a4b4f871ed5c548fc29c22cff))

- **02-02:** 追加 ArticleSnapshotSchema + capture.run 路由 ([628f91d](https://github.com/seven/web2chat/commit/628f91dbe3d51f4c0053eede03735b09d6cc53e3))

- **02-03:** 创建 extractor content script ([0f7bcae](https://github.com/seven/web2chat/commit/0f7bcaeebe53c82a33b7a8dbc464d184390f9f34))

- **02-05:** 创建 SW capture-pipeline 编排核心 ([fd87257](https://github.com/seven/web2chat/commit/fd87257e659e831cf5a4f27eb48ee516f67e1622))

- **02-05:** 注册 capture.run 顶层路由 + 补齐 capture.\* locale 键 ([f18929e](https://github.com/seven/web2chat/commit/f18929eff8f565c2c28798855b26bfa3db688f1a))

- **02-06:** Popup 演化为 capture 4-state UI ([9540aac](https://github.com/seven/web2chat/commit/9540aac91c5518a02a5d56b23246cbd98725160c))

- **03-01:** Extend ErrorCode union + create IMAdapter contract types ([8f5c1a6](https://github.com/seven/web2chat/commit/8f5c1a659f15b59c589bb0c7976aa5e87812f3d0))

- **03-01:** Split ProtocolMap into 4 route modules + add 6 new RPC schemas ([bdb301f](https://github.com/seven/web2chat/commit/bdb301fafd30c3d09be58db61fd4f49b00f999b2))

- **03-01:** Add Phase 3 i18n keys to en + zh_CN locales + dispatch contract test ([e7f7d36](https://github.com/seven/web2chat/commit/e7f7d369bcae4433c40c73030c448e1c484e6ff5))

- **03-02:** Add 5 typed storage items + extend barrel ([22cb6f5](https://github.com/seven/web2chat/commit/22cb6f5af8edc5131e2b8a3e2798d9d182b44cf7))

- **03-02:** Add popupDraft + dispatch repos with null contract + fix test isolation ([97c1bd3](https://github.com/seven/web2chat/commit/97c1bd36abdda04482d69d47f3c65230a834705c))

- **03-02:** Add history + binding repos with hybrid score + dedupe ([98bb79b](https://github.com/seven/web2chat/commit/98bb79b910936260379561989827f35cf0d6314c))

- **03-03:** Add commands.\_execute_action keyboard shortcut to manifest ([be61e0a](https://github.com/seven/web2chat/commit/be61e0a6ef40696fc791f5e2cbfc80396b50da4d))

- **03-03:** Extend verify-manifest with Phase 3 assertions + unit tests + DEVIATIONS ([cfa04c2](https://github.com/seven/web2chat/commit/cfa04c2fbd177a4df06e396f6d5417f7fe311802))

- **03-04:** Add adapter registry + mock-platform stub + platformDetector test ([f6cec83](https://github.com/seven/web2chat/commit/f6cec83c9233e49b2ebff955798136d3b198c1bb))

- **03-04:** Add dispatch-pipeline state machine + history/binding RPC handlers + state-machine tests ([9ea18b2](https://github.com/seven/web2chat/commit/9ea18b238fb6998e6bfad748c77352fd33106d52))

- **03-04:** Wire 6 RPC handlers + tabs.onUpdated + alarms.onAlarm into background.ts top level ([76cb542](https://github.com/seven/web2chat/commit/76cb54231b46ce8006831e79bd7885fe3da15c10))

- **03-05:** Extract primitives + create PlatformIcon component ([3ab5900](https://github.com/seven/web2chat/commit/3ab59002d100ce050f0cfce00cc512fb4bdc737e))

- **03-05:** Create ARIA 1.2 Combobox component ([28be8d2](https://github.com/seven/web2chat/commit/28be8d216922a4fa9e82fb619111d89cf1afc888))

- **03-05:** Create InProgressView + ErrorBanner components ([f947b6c](https://github.com/seven/web2chat/commit/f947b6c16c2cddfd84457d7467aa13fca227f4c5))

- **03-07:** Add options page entrypoint scaffolding (STG-03) ([ed6b164](https://github.com/seven/web2chat/commit/ed6b164dedcbc3c5742fd437e0f28ede7f75f250))

- **03-07:** Add ResetSection + ConfirmDialog for options page (STG-03) ([dff00e9](https://github.com/seven/web2chat/commit/dff00e93784f8522f787b367ade852d6312a9cd4))

- **03-06:** Add PopupChrome + CapturePreview + SendForm components ([1f23fd8](https://github.com/seven/web2chat/commit/1f23fd86b8b4cfcc10de5bdb62377f3a36d634e6))

- **03-06:** Refactor App.tsx — 6-state machine + parallel-read mount + 4 new signals ([bac74a7](https://github.com/seven/web2chat/commit/bac74a732641b6894d7e1b2f53a41463cf893a97))

- **04-01:** Extend ErrorCode, add dom-injector + grantedOrigins repo ([fd32404](https://github.com/seven/web2chat/commit/fd324043ad769c57113e88520ebc2fd9af9833d0))

- **04-01:** Register OpenClaw adapter, add i18n keys + unit tests ([0f11bbc](https://github.com/seven/web2chat/commit/0f11bbc04d2ec0d801d6c6fd55f720649ea7fb41))

- **04-02:** Create OpenClaw adapter content script + composeMarkdown utility ([27fae77](https://github.com/seven/web2chat/commit/27fae77ea0b93d7f239028d0c25bc4ea7063ef2a))

- **04-02:** Add unit tests for OpenClaw match + compose logic ([13b3559](https://github.com/seven/web2chat/commit/13b35590af0c4941cde60397f476d63bb7d0921d))

- **04-03:** Wire permission guard in dispatch-pipeline + SendForm permission request ([401571a](https://github.com/seven/web2chat/commit/401571a6dd9365065b6a6a6d8cd75bba85c76744))

- **04-03:** ErrorBanner extension + GrantedOriginsSection + Options wiring ([081c95f](https://github.com/seven/web2chat/commit/081c95f51d824c9ff93c705a04430ca6a3ce835a))

- **04-05:** Fix popup close on permission dialog — intent persistence + auto-resume ([8f45066](https://github.com/seven/web2chat/commit/8f45066ca5a69f14f9b98d3047ccf864bf432608))

- **popup:** Replace OpenClaw placeholder glyph with official lobster favicon SVG ([505b7d0](https://github.com/seven/web2chat/commit/505b7d0e5e2df8563ef7f05efc4ef0c08f3eb660))

- **options:** Add confirm dialog i18n keys and unit tests ([32956e3](https://github.com/seven/web2chat/commit/32956e34b2bba51048568f02a88630cdc15bb8d2))

- **05-01:** Create discord-format.ts + register Discord adapter + add webNavigation permission ([2edf297](https://github.com/seven/web2chat/commit/2edf297cd3d9893a1302fd6d64d9da9e4a073d5c))

- **05-03:** Add webNavigation listener + dispatch-pipeline login detection ([0120a4b](https://github.com/seven/web2chat/commit/0120a4b6a9746382baba8579fca81f2601cde533))

- **05-02:** Implement Discord adapter content script with ADAPTER_DISPATCH protocol ([89754e6](https://github.com/seven/web2chat/commit/89754e6e5e0c8864299f540a37200beaba40c4e6))

- **05-03:** Replace Discord letterform with brand SVG + add ToS footnote ([2c90d03](https://github.com/seven/web2chat/commit/2c90d03a78e99d95ad30c21f6df0b9230d625b73))

- **05-06:** Add Escape keydown after Enter in discordMainWorldPaste to clear Discord input ([6dcddb7](https://github.com/seven/web2chat/commit/6dcddb7fd2fd996b6f0d1fd2b035c3498f5ae7bc))

- **06-1a:** Add Vite YAML locale plugin for build-time i18n dict conversion ([ae044b0](https://github.com/seven/web2chat/commit/ae044b086ef47b67df9173997b8d55ca5d8fee27))

- **06-1a:** Add localeItem storage definition for user locale preference ([d407943](https://github.com/seven/web2chat/commit/d40794396468a7b1609e3d9939abab17b021f7d6))

- **06-1a:** Rewrite shared/i18n to signal-based t() with runtime locale switching ([5cf0c3b](https://github.com/seven/web2chat/commit/5cf0c3b1567cfc4e0397aee6bd333944af75c1b8))

- **06-1b:** Async locale init in popup/options to prevent first-frame flash ([ebc033b](https://github.com/seven/web2chat/commit/ebc033bfd52e002bc6e9b36023d1d3bd1b8c71c3))

- **06-3:** Add I18N-04 manifest **MSG\_\*** verification with explicit logging ([609d684](https://github.com/seven/web2chat/commit/609d6848b3a199fafd21c6784d997e6d58b6aad5))

- **06-2:** Replace no-restricted-syntax with inline no-hardcoded-strings ESLint plugin ([c1d73fe](https://github.com/seven/web2chat/commit/c1d73fe0185ae0011a4eecf30a0e22ffce434725))

- **06-4:** Update locale files with language section keys, remove deprecated keys ([149a7fe](https://github.com/seven/web2chat/commit/149a7fe992485fd4ecf0d8cdea9513f987d7d890))

- **06-4:** Create LanguageSection component for options page ([137a9a9](https://github.com/seven/web2chat/commit/137a9a9f2bf38de619ae50f942c09f05449f3fab))

- **06-4:** Replace ReservedSection with LanguageSection in options page ([005a1a2](https://github.com/seven/web2chat/commit/005a1a29a2c8035c7efeb40138c044dae5f2af97))

- **06-5:** Add i18n coverage audit script ([519d2b6](https://github.com/seven/web2chat/commit/519d2b6d38c8dc394793be6d64e75df10e584971))

- **07-01:** Add verify-zip.ts and verify-readme-anchors.ts scripts ([42025a9](https://github.com/seven/web2chat/commit/42025a9536dd5c578b75ed1ea329fb85c369680e))

- **07-01:** Add zip.exclude config and verify:zip/verify:readme scripts ([3474b82](https://github.com/seven/web2chat/commit/3474b82f97ba80f2cba039ef6f2cbf4efd0a4a37))

- **design:** Add shared design tokens and DESIGN.md system doc ([20a1fed](https://github.com/seven/web2chat/commit/20a1fed45f8353195bd1a4e50233018f51854d49))

- **popup:** Apply editorial design tokens and micro-interactions ([1edf4a9](https://github.com/seven/web2chat/commit/1edf4a97f3a27919923c7beb6224ed97b0cd3b03))

- **options:** Apply editorial design tokens and refactor surfaces ([9675d7c](https://github.com/seven/web2chat/commit/9675d7c41c5cdfcd8c8e6049752e4642d4c12214))

- **options:** Custom Select dropdown + tighter section padding ([d4694ef](https://github.com/seven/web2chat/commit/d4694efd3bd04cf2d9f57b274f8013019485cea7))

- **popup:** Merge settings into popup via gear icon toggle ([c25592e](https://github.com/seven/web2chat/commit/c25592e49e40e9533fa87bd1f24b32b11e594940))

- **icons:** Replace chat-bubble logo with browser-window dual-panel design ([cb33c13](https://github.com/seven/web2chat/commit/cb33c13fcf703750579dfd26d7669f16b9b8cfa9))

- **popup:** Add back arrow in settings mode for clear navigation ([9226437](https://github.com/seven/web2chat/commit/922643704ac7d0d568af19a4eeeb6e46efbffe34))

### Other

- **gsd:** Init gsg ([a1c8f66](https://github.com/seven/web2chat/commit/a1c8f66d0ad20d90faac82c6daebd6da70ece715))

- **01-1:** Add GitHub Actions workflow + verify-manifest script (FND-05, D-11) ([eab74a5](https://github.com/seven/web2chat/commit/eab74a5deb548ba1fa7017295a287321dd116417))

- **01-1:** Make `pnpm test` pass with no tests yet ([da1b4b4](https://github.com/seven/web2chat/commit/da1b4b49d4c5d5c43d761c8f2ad01b892fe5e39d))

- **01:** Replace placeholder icons with real SVG + 4 PNG sizes ([6f073ae](https://github.com/seven/web2chat/commit/6f073ae889029b0067ede2fa161b213d63f03840))

- **gsd:** Update gsd ([6b352ad](https://github.com/seven/web2chat/commit/6b352adf9cdafa808109b8f139ae8932d0077a22))

- **release:** Add tag-triggered release workflow and installation docs ([5ddd2c4](https://github.com/seven/web2chat/commit/5ddd2c4f68b68843a44e55b757957ed67b63c460))

### Refactoring

- **e2e:** Extract shared helper + fix tautological timing test ([85ef121](https://github.com/seven/web2chat/commit/85ef121f901f973a6c28fa96eea38e2fa7cb416b))

- **types:** Replace any with precise types in adapters and tests ([bc1f251](https://github.com/seven/web2chat/commit/bc1f251f4070136609f6c07b3cd9148f5df70456))

- **types:** Use TurndownService in turndown-plugin-gfm shim ([16ac7b2](https://github.com/seven/web2chat/commit/16ac7b2ec34bc5c681d890c1fe9e84a05599e10a))

- **design:** Pivot to Obsidian-style charcoal + emerald ([dc13a0e](https://github.com/seven/web2chat/commit/dc13a0e723632f091214a87a592fb31d5e653af4))

### Tests

- **01-3:** Cover protocol shape + bumpHello handler core ([8f6905c](https://github.com/seven/web2chat/commit/8f6905c1383bb073d361fb07f7d757947e2591d0))

- **01-4:** Playwright e2e — popup RPC + SW-restart resilience ([cccbd3a](https://github.com/seven/web2chat/commit/cccbd3ac6abf1053b6fe01b8c6fef4a915f90365))

- **02-02:** ErrorCode 扩展为 4 个码 + 验证测试 ([f5e10d2](https://github.com/seven/web2chat/commit/f5e10d2604c70cb983924c855adef12c6e8bd5e5))

- **02-04:** 创建 extractor 三个单元测试 (jsdom) ([3471b4d](https://github.com/seven/web2chat/commit/3471b4df498d7c88a19187949959548e829a507b))

- **02-04:** 创建 capture pipeline 单元测试 (mirror 函数模式) ([b940689](https://github.com/seven/web2chat/commit/b940689136f03c205a3412eab403823820546d16))

- **02-07:** 创建 capture E2E spec（happy path + 编辑可用 + empty 状态） ([e62616b](https://github.com/seven/web2chat/commit/e62616b0b33cc75e50015cf68ce6ae1d11392de7))

- **02:** Persist Phase 2 human verification items + VERIFICATION report ([d133b37](https://github.com/seven/web2chat/commit/d133b3742e8c6bbd925892cc574ffdef39a393f3))

- **02:** Record G-1 BLOCKER from UAT 1 — Chrome rejects dotted i18n keys ([e7bdc3f](https://github.com/seven/web2chat/commit/e7bdc3f415c13f9bee7474b1bac45358209a63d5))

- **02:** UAT 5/5 passed — Phase 2 verification fully closed ([4e1f58e](https://github.com/seven/web2chat/commit/4e1f58e72e31559da4a0be0befe8a2f7ac836b2f))

- **03-08:** Add mock-platform fixture + dispatch e2e specs (5 tests) ([0b7ef8a](https://github.com/seven/web2chat/commit/0b7ef8afd0640179c5b4d18b9598e5d786bebc86))

- **03-08:** Add draft-recovery + options-reset e2e specs (3 tests) ([e6c0414](https://github.com/seven/web2chat/commit/e6c041440f7b91d9167cf6c2af2d40aa18e664dd))

- **04-04:** Create OpenClaw E2E fixture + happy-path dispatch spec ([ded3b0d](https://github.com/seven/web2chat/commit/ded3b0dd638fe5e22df9deebbe2eb4e6a9dfa289))

- **04-04:** Add offline + permission E2E specs + permission deny unit test ([8f0a399](https://github.com/seven/web2chat/commit/8f0a3999fc03338b3d1d984e6889ee3fe7aa539d))

- **04:** Complete UAT — 6 passed, 4 issues (popup closes on dispatch) ([c66459d](https://github.com/seven/web2chat/commit/c66459d502b17fe10b0e407ff77b7d566f5ef05e))

- **04:** Verify gap closure + persist human UAT items ([165804a](https://github.com/seven/web2chat/commit/165804ae0d5c66def53f2289bc3a42938945f1d3))

- **05-01:** Add discord-format and discord-match unit tests ([ba25311](https://github.com/seven/web2chat/commit/ba25311d0477cb19aa21d35eb9bf7c70bbd61e82))

- **05-02:** Add Discord DOM fixture and selector/paste unit tests ([758343a](https://github.com/seven/web2chat/commit/758343a6b0be210f0c782cf54f29bce57f5eed3f))

- **05-04:** Add Discord E2E stub fixture + serve rewrite config ([cd6547b](https://github.com/seven/web2chat/commit/cd6547ba45aa9da18f1e0b9e5f8ed87a720b3bac))

- **05-04:** Add Discord E2E dispatch + login specs ([7ce5f1c](https://github.com/seven/web2chat/commit/7ce5f1c912666090200aac899c894cbedcb44478))

- **05-04:** Add Discord channel-switch E2E spec (D-68, SC#3) ([46c773d](https://github.com/seven/web2chat/commit/46c773d8dae56325f77ba99bf13d7644163a3f26))

- **05:** Complete UAT re-verification - 5 passed, 2 issues, 1 skipped, 1 blocked ([4990e84](https://github.com/seven/web2chat/commit/4990e84ad79cf062a183a6673552e9de73fe0421))

- **05-06:** Add mirror tests for Escape keydown after Enter in discordMainWorldPaste ([2764ae9](https://github.com/seven/web2chat/commit/2764ae95879d8047b210b4f7f1cd3c959ce851d6))

- **05-06:** Add failing tests for ADAPTER_RESPONSE_TIMEOUT_MS = 20_000 ([3598b46](https://github.com/seven/web2chat/commit/3598b4657472972bcc12c2f7cd1326ca50fa2851))

- **05:** Add injection guard and editor-state confirmation tests ([3c28265](https://github.com/seven/web2chat/commit/3c2826510be82ec232fcb2f5d05272f60e3674ae))

- **06-1a:** Add failing locale-switch tests (TDD RED) ([475e982](https://github.com/seven/web2chat/commit/475e9825172e5eccd4a136d58eaf27b7f72ddb34))

- **06-2:** Add ESLint no-hardcoded-strings fixture file ([1a92b5b](https://github.com/seven/web2chat/commit/1a92b5b96abdd432893bd4f000fedf216f08e3ea))

- **06-2:** Add Vitest ESLint rule test with fixture validation ([eed30d5](https://github.com/seven/web2chat/commit/eed30d5ad0d067ea86710f2c19f74a561ffe1639))

- **06:** Persist human verification items as UAT ([29aba34](https://github.com/seven/web2chat/commit/29aba34af4cd7141dde92a78a9651530ac3ceb04))

- **07:** Persist human verification items as UAT ([202c8e4](https://github.com/seven/web2chat/commit/202c8e48e706d619ce19974033ed972a9a7a6ff4))

- **06:** Complete UAT - 6 passed, 0 issues ([08bca37](https://github.com/seven/web2chat/commit/08bca3790a7d05f649f786719197ce513ea25f25))

- **07:** Complete UAT - 3 passed, 0 issues ([d1c36bb](https://github.com/seven/web2chat/commit/d1c36bb1ba4649ef77096b975dc49d61293e1693))
