# 🗂️ Project Structure: .

**Generated**: 2026-01-12 22:36:55
**Purpose**: Quick navigation reference for Claude (token-efficient)

---

## 📁 Directory Tree

```
/Users/imorgado/Desktop/Projects/komplete-kontrol-cli
├── 📄 --help
├── 📁 .claude/
├── 📄 auto-continue.local.md
├── 📄 checkpoint-state.json
├── 📄 file-changes.json
├── 📄 health.json
├── 📁 memory/
│   ├── 📄 actions.jsonl
│   ├── 📄 episodic.json
│   ├── 📁 master/
│   │   ├── 📄 actions.jsonl
│   │   ├── 📁 checkpoints/
│   │   ├── 📁 embeddings/
│   │   ├── 📄 episodic.json
│   │   ├── 📄 file-cache.json
│   │   ├── 📄 reflections.json
│   │   ├── 📄 semantic.json
│   │   ├── 📄 vector-cache.json
│   │   └── 📄 working.json
│   ├── 📄 reflections.json
│   ├── 📄 semantic.json
│   └── 📄 working.json
└── 📄 project-index.md
├── 📄 .eslintignore
├── 📄 .gitignore
├── 📁 .komplete/
└── 📁 sessions/
│   ├── 📄 .keep
│   ├── 📄 session-1768182776836-plwpndn.json
│   ├── 📄 session-1768182776837-t2c4w0j.json
│   ├── 📄 session-1768182776838-8utqg2p.json
│   ├── 📄 session-1768182776838-akfonpe.json
│   ├── 📄 session-1768182776838-zsra0i1.json
│   ├── 📄 session-1768182776839-ik2yukn.json
│   ├── 📄 session-1768182776839-izjp20c.json
│   ├── 📄 session-1768182776840-iahw7tf.json
│   ├── 📄 session-1768210561134-e0wgeii.json
│   ├── 📄 session-1768210575601-wox9g7v.json
│   └── 📄 session_1768168184174_pqocclc.json
├── 📄 .kompleterc.json
├── 📄 .memory-test.md
├── 📄 .memory.md
├── 📁 .ruff_cache/
├── 📄 .gitignore
├── 📁 0.14.10/
│   └── 📄 7731983317421308213
└── 📄 CACHEDIR.TAG
├── 📄 3-LAYER-DEFENSE-VERIFICATION.md
├── 📄 ALTERNATIVE-SOLUTION.md
├── 📄 AUTO_MODE_SESSION_SUMMARY.md
├── 📄 CLAUDE-CODE-SOLUTIONS-GUIDE.md
├── 📄 CLAUDE.md
├── 📄 CLAUDED-RATE-LIMIT-FIX.md
├── 📄 CLAUDED-WRAPPER-GUIDE.md
├── 📄 CLAUDED_VERIFICATION_SUMMARY.md
├── 📄 CLAUDE_CODE_FIX.md
├── 📄 CONSTITUTIONAL-AI-FIX-REPORT.md
├── 📄 COORDINATOR-FIXES-CODE-DIFF.md
├── 📄 COORDINATOR-FIXES-COMPARISON.md
├── 📄 COORDINATOR-FIXES-DOCUMENTATION.md
├── 📄 COORDINATOR-FIXES-QUICK-REFERENCE.md
├── 📄 FEATHERLESS_TEST_RESULTS.md
├── 📄 FINAL-FIX-INSTRUCTIONS.md
├── 📄 FINAL-SOLUTION-SUMMARY.md
├── 📄 FINAL-VERIFICATION-REPORT.md
├── 📄 FINAL_MODEL_TEST_RESULTS.md
├── 📄 FIX-SUMMARY-FOR-MEMORY.md
├── 📄 GLM-4.7-CLI-TEST-GUIDE.md
├── 📄 GLM-4.7-VERIFICATION-COMPLETE.md
├── 📄 IMPLEMENTATION_SESSION_SUMMARY.md
├── 📄 MAX-TOKENS-FIX-REPORT.md
├── 📄 MCP_MULTI_MODEL_RESEARCH.md
├── 📄 MODEL-DISCOVERY-ANALYSIS.md
├── 📄 MODEL-PICKER-FIX-V2.md
├── 📄 MODEL-PICKER-FIX.md
├── 📄 MODEL-SWITCHER-GUIDE.md
├── 📄 MODEL_INTEGRATION_COMPLETE.md
├── 📄 MULTI-MODEL-DELEGATION-GUIDE.md
├── 📄 QUICK-FIX-SUMMARY.md
├── 📄 QUICKSTART.md
├── 📄 RATE-LIMIT-PREVENTION-GUIDE.md
├── 📄 RATE-LIMIT-QUICK-START.md
├── 📄 README.md
├── 📄 VERIFY-MODEL-PICKER-FIX.sh
├── 📄 VISUAL_TEST_RESULTS_COMPLETE.md
├── 📁 [object Object]/
├── 📄 session-1768184084460-r40byir.json
├── 📄 session-1768184084463-kxeoww3.json
├── 📄 session-1768184084464-0n85wir.json
├── 📄 session-1768184084464-bzofio3.json
├── 📄 session-1768184084464-gg4hdih.json
├── 📄 session-1768184084464-zqsy1ej.json
├── 📄 session-1768184084465-2qybna1.json
├── 📄 session-1768184084465-4c87jds.json
├── 📄 session-1768184137570-qj0kjbg.json
├── 📄 session-1768184137570-xkzbcer.json
├── 📄 session-1768184137571-6a9jims.json
├── 📄 session-1768184137571-b33klcv.json
├── 📄 session-1768184137571-csg4zbr.json
├── 📄 session-1768184137571-du15mor.json
├── 📄 session-1768184137572-fm4al39.json
├── 📄 session-1768184137572-hkl69sg.json
├── 📄 session-1768184716345-nmvroar.json
├── 📄 session-1768184716347-r5jwrkn.json
├── 📄 session-1768184716348-4eofyka.json
├── 📄 session-1768184716349-4mkqq2s.json
├── 📄 session-1768184716349-qvrl0kt.json
├── 📄 session-1768184716349-tqvx1z3.json
├── 📄 session-1768184716349-wi9o7gy.json
├── 📄 session-1768184716350-strtwie.json
├── 📄 session-1768184731956-56k946k.json
├── 📄 session-1768184731956-cdu2hja.json
├── 📄 session-1768184731956-hr195by.json
├── 📄 session-1768184731956-p6a6ui8.json
├── 📄 session-1768184731957-7fyycrl.json
├── 📄 session-1768184731957-hsdczo5.json
├── 📄 session-1768184731957-huy92m7.json
├── 📄 session-1768184731957-jxup7l4.json
├── 📄 session-1768186228498-zisfwps.json
├── 📄 session-1768186228499-25sak2b.json
├── 📄 session-1768186228499-vwr8zmh.json
├── 📄 session-1768186228500-5dve4ah.json
├── 📄 session-1768186228500-bw4hei7.json
├── 📄 session-1768186228500-js82yyq.json
├── 📄 session-1768186228500-k4z5xjm.json
├── 📄 session-1768186228500-rw5eoa7.json
├── 📄 session-1768186316161-6uu88i5.json
├── 📄 session-1768186316162-qdu4abp.json
├── 📄 session-1768186316162-ujqgfgw.json
├── 📄 session-1768186316162-x39kdbj.json
├── 📄 session-1768186316163-be5q2yi.json
├── 📄 session-1768186316163-dvx8kqc.json
├── 📄 session-1768186316164-an9bqrw.json
├── 📄 session-1768186316164-s3ek2tm.json
├── 📄 session-1768186611333-wx4bnu5.json
├── 📄 session-1768186611334-curh6jt.json
├── 📄 session-1768186611335-0mr98zb.json
├── 📄 session-1768186611335-1wt9d74.json
├── 📄 session-1768186611335-24e9272.json
├── 📄 session-1768186611335-lbx5ca1.json
├── 📄 session-1768186611335-wshku9s.json
├── 📄 session-1768186611335-zvku95j.json
├── 📄 session-1768187115861-s1lp4wy.json
├── 📄 session-1768187115862-g7b3bhh.json
├── 📄 session-1768187115863-c5tqv7n.json
├── 📄 session-1768187115863-hwq9dn1.json
├── 📄 session-1768187115863-j7skybo.json
├── 📄 session-1768187115863-n4fst9s.json
├── 📄 session-1768187115863-yiy7dzi.json
├── 📄 session-1768187115864-qwihthb.json
├── 📄 session-1768187144688-qpit7um.json
├── 📄 session-1768187144689-aalryhj.json
├── 📄 session-1768187144690-gtgu58m.json
├── 📄 session-1768187144690-jcv99a7.json
├── 📄 session-1768187144690-nnkrdfz.json
├── 📄 session-1768187144690-vrbvqal.json
├── 📄 session-1768187144691-1ft5u4j.json
└── 📄 session-1768187144691-zalclo9.json
├── 📄 bun.lock
├── 📄 clauded-v2.sh
├── 📄 clauded-wrapper.sh
├── 📁 docs/
├── 📄 FEATURE_COMPARISON_AND_RECOMMENDATIONS.md
├── 📄 IMPLEMENTATION_PLAN.md
├── 📄 PHASE1_SUMMARY.md
├── 📄 PHASE2_SUMMARY.md
├── 📄 PHASE4_SUMMARY.md
├── 📄 agents.md
└── 📄 providers.md
├── 📄 fix-claude-cli.sh
├── 📄 fix-unicode-escapes.js
├── 📄 index.ts
├── 📁 mcp-servers/
├── 📄 model-test-suite.cjs
├── 📄 package.json
├── 📄 patch-model-picker-http.cjs
├── 📄 patch-model-picker-sync.cjs
├── 📄 patch-model-picker.cjs
├── 📄 patch-proxy-rate-limiter.cjs
├── 📁 plans/
├── 📄 architectural-enhancement-analysis.md
├── 📄 god-mode-vscode-integration-analysis.md
├── 📄 strategic-synthesis-plan-remaining.md
└── 📄 strategic-synthesis-plan.md
├── 📁 py/
├── 📁 src/
├── 📁 cli/
│   ├── 📄 chat.ts
│   ├── 📁 commands/
│   ├── 📁 display/
│   └── 📄 index.ts
├── 📁 config/
│   └── 📄 index.ts
├── 📁 core/
│   ├── 📁 agents/
│   │   ├── 📄 communication.ts
│   │   ├── 📄 coordination.ts
│   │   ├── 📄 executor.ts
│   │   ├── 📄 hierarchy.ts
│   │   ├── 📄 index.ts
│   │   ├── 📄 lifecycle.ts
│   │   ├── 📄 mcp-integration.ts
│   │   ├── 📄 orchestrator.ts
│   │   ├── 📄 patterns.ts
│   │   ├── 📄 registry.ts
│   │   ├── 📄 teams.ts
│   │   ├── 📄 test-agents.ts
│   │   └── 📄 workflows.ts
│   ├── 📁 commands/
│   │   ├── 📁 builtin/
│   │   ├── 📄 index.ts
│   │   ├── 📄 parser.ts
│   │   ├── 📄 registry.ts
│   │   └── 📄 types.ts
│   ├── 📁 context/
│   │   ├── 📄 condensation.ts
│   │   ├── 📄 contextignore.ts
│   │   ├── 📄 enhanced-condensation.ts
│   │   ├── 📄 index.ts
│   │   ├── 📄 memory-file.ts
│   │   ├── 📄 memory.ts
│   │   ├── 📄 multi-session.ts
│   │   ├── 📄 optimization.ts
│   │   ├── 📄 session.ts
│   │   ├── 📄 tokens.ts
│   │   ├── 📄 tool-selection.ts
│   │   └── 📄 window.ts
│   ├── 📁 healing/
│   │   ├── 📄 index.ts
│   │   ├── 📄 linter-integration.ts
│   │   ├── 📄 loop.ts
│   │   ├── 📄 patterns.ts
│   │   ├── 📄 repl-interface.ts
│   │   ├── 📄 runtime-supervisor.ts
│   │   ├── 📄 shadow-mode.ts
│   │   ├── 📄 stderr-parser.ts
│   │   ├── 📄 suggestions.ts
│   │   └── 📄 validation.ts
│   ├── 📁 hooks/
│   │   └── 📄 index.ts
│   ├── 📁 indexing/
│   │   ├── 📄 context-stuffing.ts
│   │   ├── 📄 dependencies.ts
│   │   ├── 📄 index.ts
│   │   ├── 📄 structure.ts
│   │   └── 📄 tree-sitter.ts
│   ├── 📁 providers/
│   │   ├── 📁 advanced/
│   │   ├── 📄 anthropic.ts
│   │   ├── 📄 base.ts
│   │   ├── 📄 index.ts
│   │   ├── 📄 ollama.ts
│   │   ├── 📄 openai.ts
│   │   ├── 📄 registry.ts
│   │   └── 📄 router.ts
│   ├── 📁 router/
│   ├── 📁 session/
│   └── 📁 tasks/
│   │   ├── 📄 aggregator.ts
│   │   ├── 📄 dependency-resolver.ts
│   │   ├── 📄 executor.ts
│   │   ├── 📄 index.ts
│   │   └── 📄 planner.ts
├── 📁 integrations/
├── 📁 mcp/
│   ├── 📄 agent-executor.ts
│   ├── 📄 client.ts
│   ├── 📄 discovery.ts
│   ├── 📄 index.ts
│   ├── 📄 registry.ts
│   ├── 📄 result-handler.ts
│   ├── 📁 servers/
│   │   └── 📄 echo-server.ts
│   ├── 📄 stdio-bridge.ts
│   └── 📄 types.ts
├── 📁 reversing/
├── 📁 types/
│   └── 📄 index.ts
└── 📁 utils/
│   ├── 📄 error-handler.ts
│   └── 📄 logger.ts
├── 📄 test-all-featherless.cjs
├── 📄 test-all-providers.cjs
├── 📄 test-constitutional-ai-fix.sh
├── 📄 test-coordinator-fixes.sh
├── 📄 test-coordinator-integration.sh
├── 📄 test-final-all-models.cjs
├── 📄 test-glm-tools.cjs
├── 📄 test-models-loaded.sh
├── 📁 test-results/
├── 📁 glm-4.7-verification/
│   ├── 📄 GLM-4.7-FEATURE-COMPARISON.md
│   ├── 📄 basic-request.json
│   ├── 📄 basic-response.json
│   ├── 📄 chinese-request.json
│   ├── 📄 chinese-response.json
│   ├── 📄 coding-request.json
│   ├── 📄 coding-response.json
│   ├── 📄 model-info.json
│   ├── 📄 summary.md
│   ├── 📄 tool-request.json
│   └── 📄 tool-response.json
├── 📁 run_20260112_200732/
│   ├── 📁 logs/
│   ├── 📁 results/
│   └── 📁 screenshots/
└── 📁 run_20260112_200846/
│   ├── 📁 logs/
│   ├── 📁 results/
│   │   ├── 📄 dolphin_agent.json
│   │   ├── 📄 dolphin_mcp.json
│   │   ├── 📄 dolphin_summary.json
│   │   ├── 📄 dolphin_tool.json
│   │   ├── 📄 llama70b_agent.json
│   │   ├── 📄 llama70b_mcp.json
│   │   ├── 📄 llama70b_summary.json
│   │   ├── 📄 llama70b_tool.json
│   │   ├── 📄 llama8b_agent.json
│   │   ├── 📄 llama8b_mcp.json
│   │   ├── 📄 llama8b_summary.json
│   │   ├── 📄 llama8b_tool.json
│   │   ├── 📄 qwen_agent.json
│   │   ├── 📄 qwen_mcp.json
│   │   ├── 📄 qwen_summary.json
│   │   ├── 📄 qwen_tool.json
│   │   ├── 📄 rabbit_agent.json
│   │   ├── 📄 rabbit_mcp.json
│   │   ├── 📄 rabbit_summary.json
│   │   └── 📄 rabbit_tool.json
│   └── 📁 screenshots/
├── 📁 tests/
├── 📄 advanced-provider-features.test.ts
├── 📄 agent-communication.test.ts
├── 📄 agent-coordination.test.ts
├── 📄 agent-executor.test.ts
├── 📄 agent-lifecycle.test.ts
├── 📄 all.test.ts
├── 📄 clauded-model-capabilities.test.ts
├── 📄 codebase-indexing.test.ts
├── 📄 commands.test.ts
├── 📄 config.test.ts
├── 📄 context-management.test.ts
├── 📄 cost-tracker.test.ts
├── 📄 enhanced-context-management.test.ts
├── 📄 error-handler.test.ts
├── 📄 logger.test.ts
├── 📄 mcp-agent-executor.test.ts
├── 📄 mcp-discovery.test.ts
├── 📄 mcp-integration.test.ts
├── 📄 mcp-result-handler.test.ts
├── 📄 mcp.test.ts
├── 📄 phase4.test.ts
├── 📄 providers.test.ts
├── 📄 self-healing-loop.test.ts
├── 📄 task-execution.test.ts
└── 📄 token-counter.test.ts
├── 📄 tsconfig.json
├── 📄 verify-constitutional-ai-fix.sh
├── 📄 visual-auto-tester-v2.sh
├── 📄 visual-auto-tester.sh
└── 📄 visual-model-tester.sh
```

---

## 📋 Important Files

### Configuration
• ./.kompleterc.json
• ./.claude/file-changes.json
• ./.claude/checkpoint-state.json
• ./.claude/health.json
• ./package.json
• ./[object Object]/session-1768186228498-zisfwps.json
• ./[object Object]/session-1768184084464-zqsy1ej.json
• ./[object Object]/session-1768186611335-zvku95j.json
• ./[object Object]/session-1768184716349-4mkqq2s.json
• ./[object Object]/session-1768184716349-qvrl0kt.json
• ./[object Object]/session-1768186228500-js82yyq.json
• ./[object Object]/session-1768187144691-1ft5u4j.json
• ./[object Object]/session-1768187115863-n4fst9s.json
• ./[object Object]/session-1768184731957-7fyycrl.json
• ./[object Object]/session-1768184731956-56k946k.json
• ./[object Object]/session-1768187144690-gtgu58m.json
• ./[object Object]/session-1768184137570-qj0kjbg.json
• ./[object Object]/session-1768187115863-hwq9dn1.json
• ./[object Object]/session-1768186611335-lbx5ca1.json
• ./[object Object]/session-1768184084465-2qybna1.json
• ./[object Object]/session-1768187115863-yiy7dzi.json
• ./[object Object]/session-1768186611334-curh6jt.json
• ./[object Object]/session-1768186316164-s3ek2tm.json
• ./[object Object]/session-1768187115863-c5tqv7n.json
• ./[object Object]/session-1768184716348-4eofyka.json
• ./[object Object]/session-1768186316163-be5q2yi.json
• ./[object Object]/session-1768186228499-25sak2b.json
• ./[object Object]/session-1768186228499-vwr8zmh.json
• ./[object Object]/session-1768184084464-gg4hdih.json
• ./[object Object]/session-1768184716349-tqvx1z3.json
• ./[object Object]/session-1768184137570-xkzbcer.json
• ./[object Object]/session-1768184716350-strtwie.json
• ./[object Object]/session-1768186316164-an9bqrw.json
• ./[object Object]/session-1768186316163-dvx8kqc.json
• ./[object Object]/session-1768184084465-4c87jds.json
• ./[object Object]/session-1768184731956-hr195by.json
• ./[object Object]/session-1768184084460-r40byir.json
• ./[object Object]/session-1768187115862-g7b3bhh.json
• ./[object Object]/session-1768186316161-6uu88i5.json
• ./[object Object]/session-1768184137571-du15mor.json
• ./[object Object]/session-1768184084463-kxeoww3.json
• ./[object Object]/session-1768187144691-zalclo9.json
• ./[object Object]/session-1768187115861-s1lp4wy.json
• ./[object Object]/session-1768186611335-0mr98zb.json
• ./[object Object]/session-1768184716347-r5jwrkn.json
• ./[object Object]/session-1768184084464-bzofio3.json
• ./[object Object]/session-1768187144690-jcv99a7.json
• ./[object Object]/session-1768186228500-rw5eoa7.json
• ./[object Object]/session-1768184731957-jxup7l4.json
• ./[object Object]/session-1768186316162-ujqgfgw.json
• ./[object Object]/session-1768184731956-cdu2hja.json
• ./[object Object]/session-1768186316162-qdu4abp.json
• ./[object Object]/session-1768186228500-k4z5xjm.json
• ./[object Object]/session-1768184137571-csg4zbr.json
• ./[object Object]/session-1768187144689-aalryhj.json
• ./[object Object]/session-1768184716345-nmvroar.json
• ./[object Object]/session-1768186611335-wshku9s.json
• ./[object Object]/session-1768187115863-j7skybo.json
• ./[object Object]/session-1768186611335-1wt9d74.json
• ./[object Object]/session-1768184137572-fm4al39.json
• ./[object Object]/session-1768187144688-qpit7um.json
• ./[object Object]/session-1768186228500-5dve4ah.json
• ./[object Object]/session-1768187144690-nnkrdfz.json
• ./[object Object]/session-1768186228500-bw4hei7.json
• ./[object Object]/session-1768186316162-x39kdbj.json
• ./[object Object]/session-1768184716349-wi9o7gy.json
• ./[object Object]/session-1768186611333-wx4bnu5.json
• ./[object Object]/session-1768184731956-p6a6ui8.json
• ./[object Object]/session-1768184137572-hkl69sg.json
• ./[object Object]/session-1768184137571-b33klcv.json
• ./[object Object]/session-1768187144690-vrbvqal.json
• ./[object Object]/session-1768186611335-24e9272.json
• ./[object Object]/session-1768184731957-huy92m7.json
• ./[object Object]/session-1768184084464-0n85wir.json
• ./[object Object]/session-1768184137571-6a9jims.json
• ./[object Object]/session-1768184731957-hsdczo5.json
• ./[object Object]/session-1768187115864-qwihthb.json
• ./tsconfig.json

### Documentation
• ./README.md
• ./CLAUDE.md
• ./FINAL-VERIFICATION-REPORT.md
• ./RATE-LIMIT-PREVENTION-GUIDE.md
• ./CLAUDED-WRAPPER-GUIDE.md
• ./ALTERNATIVE-SOLUTION.md
• ./FINAL-FIX-INSTRUCTIONS.md
• ./MULTI-MODEL-DELEGATION-GUIDE.md
• ./MODEL-SWITCHER-GUIDE.md
• ./MODEL-PICKER-FIX.md
• ./CLAUDED-RATE-LIMIT-FIX.md
• ./MODEL-DISCOVERY-ANALYSIS.md
• ./CONSTITUTIONAL-AI-FIX-REPORT.md
• ./plans/strategic-synthesis-plan-remaining.md
• ./plans/god-mode-vscode-integration-analysis.md
• ./plans/strategic-synthesis-plan.md
• ./plans/architectural-enhancement-analysis.md
• ./MODEL_INTEGRATION_COMPLETE.md
• ./FIX-SUMMARY-FOR-MEMORY.md
• ./QUICKSTART.md
• ./.claude/auto-continue.local.md
• ./.claude/project-index.md
• ./docs/providers.md
• ./docs/PHASE1_SUMMARY.md
• ./docs/PHASE4_SUMMARY.md
• ./docs/PHASE2_SUMMARY.md
• ./docs/agents.md
• ./docs/FEATURE_COMPARISON_AND_RECOMMENDATIONS.md
• ./docs/IMPLEMENTATION_PLAN.md
• ./MCP_MULTI_MODEL_RESEARCH.md
• ./.memory-test.md
• ./README.md
• ./GLM-4.7-VERIFICATION-COMPLETE.md
• ./COORDINATOR-FIXES-QUICK-REFERENCE.md
• ./RATE-LIMIT-QUICK-START.md
• ./QUICK-FIX-SUMMARY.md
• ./FEATHERLESS_TEST_RESULTS.md
• ./GLM-4.7-CLI-TEST-GUIDE.md
• ./FINAL_MODEL_TEST_RESULTS.md
• ./MAX-TOKENS-FIX-REPORT.md
• ./FINAL-SOLUTION-SUMMARY.md
• ./CLAUDE_CODE_FIX.md
• ./VISUAL_TEST_RESULTS_COMPLETE.md
• ./COORDINATOR-FIXES-COMPARISON.md
• ./AUTO_MODE_SESSION_SUMMARY.md
• ./COORDINATOR-FIXES-DOCUMENTATION.md
• ./COORDINATOR-FIXES-CODE-DIFF.md
• ./MODEL-PICKER-FIX-V2.md
• ./IMPLEMENTATION_SESSION_SUMMARY.md
• ./3-LAYER-DEFENSE-VERIFICATION.md
• ./CLAUDE.md
• ./CLAUDED_VERIFICATION_SUMMARY.md
• ./CLAUDE-CODE-SOLUTIONS-GUIDE.md
• ./.memory.md

### Entry Points
• ./dist/index.js
• ./node_modules/pako/index.js
• ./node_modules/is-docker/index.js
• ./node_modules/is-docker/index.d.ts
• ./node_modules/jws/index.js
• ./node_modules/callsites/index.js
• ./node_modules/callsites/index.d.ts
• ./node_modules/is-inside-container/index.js
• ./node_modules/is-inside-container/index.d.ts
• ./node_modules/triple-beam/index.js
• ./node_modules/agentkeepalive/index.js
• ./node_modules/agentkeepalive/index.d.ts
• ./node_modules/zod/index.d.cts
• ./node_modules/zod/index.js
• ./node_modules/zod/index.cjs
• ./node_modules/zod/index.d.ts
• ./node_modules/simple-swizzle/index.js
• ./node_modules/pg-int8/index.js
• ./node_modules/node-gyp-build/index.js
• ./node_modules/humanize-ms/index.js
• ./node_modules/define-data-property/index.js
• ./node_modules/define-data-property/index.d.ts
• ./node_modules/fs-constants/index.js
• ./node_modules/globals/index.js
• ./node_modules/globals/index.d.ts
• ./node_modules/lodash.includes/index.js
• ./node_modules/lodash/index.js
• ./node_modules/has-unicode/index.js
• ./node_modules/process-nextick-args/index.js
• ./node_modules/shebang-regex/index.js
• ./node_modules/shebang-regex/index.d.ts
• ./node_modules/groq-sdk/index.d.mts
• ./node_modules/groq-sdk/index.js
• ./node_modules/groq-sdk/index.mjs.map
• ./node_modules/groq-sdk/index.mjs
• ./node_modules/groq-sdk/index.js.map
• ./node_modules/groq-sdk/index.d.ts
• ./node_modules/groq-sdk/index.d.ts.map
• ./node_modules/jwa/index.js
• ./node_modules/path-is-absolute/index.js
• ./node_modules/is-wsl/index.js
• ./node_modules/is-wsl/index.d.ts
• ./node_modules/has-property-descriptors/index.js
• ./node_modules/stdin-discarder/index.js
• ./node_modules/stdin-discarder/index.d.ts
• ./node_modules/extend/index.js
• ./node_modules/make-dir/index.js
• ./node_modules/make-dir/index.d.ts
• ./node_modules/strip-ansi/index.js
• ./node_modules/strip-ansi/index.d.ts
• ./node_modules/tree-sitter/index.js
• ./node_modules/prebuild-install/index.js
• ./node_modules/flatted/index.js
• ./node_modules/es-errors/index.js
• ./node_modules/es-errors/index.d.ts
• ./node_modules/node-domexception/index.js
• ./node_modules/bundle-name/index.js
• ./node_modules/mimic-function/index.js
• ./node_modules/mimic-function/index.d.ts
• ./node_modules/text-decoder/index.js
• ./node_modules/node-addon-api/index.js
• ./node_modules/ms/index.js
• ./node_modules/escape-string-regexp/index.js
• ./node_modules/escape-string-regexp/index.d.ts
• ./node_modules/lodash.isstring/index.js
• ./node_modules/has-tostringtag/index.js
• ./node_modules/has-tostringtag/index.d.ts
• ./node_modules/strip-json-comments/index.js
• ./node_modules/strip-json-comments/index.d.ts
• ./node_modules/type-fest/index.d.ts
• ./node_modules/require-directory/index.js
• ./node_modules/memory-pager/index.js
• ./node_modules/lop/index.js
• ./node_modules/escalade/index.d.mts
• ./node_modules/escalade/index.d.ts
• ./node_modules/typed-emitter/index.d.ts
• ./node_modules/cohere-ai/index.js
• ./node_modules/cohere-ai/index.d.ts
• ./node_modules/chai/index.js
• ./node_modules/color-string/index.js
• ./node_modules/redis-parser/index.js
• ./node_modules/side-channel-list/index.js
• ./node_modules/side-channel-list/index.d.ts
• ./node_modules/fast-json-stable-stringify/index.js
• ./node_modules/fast-json-stable-stringify/index.d.ts
• ./node_modules/deep-extend/index.js
• ./node_modules/detect-libc/index.d.ts
• ./node_modules/balanced-match/index.js
• ./node_modules/path-exists/index.js
• ./node_modules/path-exists/index.d.ts
• ./node_modules/check-error/index.js
• ./node_modules/lodash.once/index.js
• ./node_modules/call-bind-apply-helpers/index.js
• ./node_modules/call-bind-apply-helpers/index.d.ts
• ./node_modules/define-lazy-prop/index.js
• ./node_modules/define-lazy-prop/index.d.ts
• ./node_modules/base64-js/index.js
• ./node_modules/base64-js/index.d.ts
• ./node_modules/nanoid/index.d.cts
• ./node_modules/nanoid/index.browser.js
• ./node_modules/nanoid/index.js
• ./node_modules/nanoid/index.browser.cjs
• ./node_modules/nanoid/index.cjs
• ./node_modules/nanoid/index.d.ts
• ./node_modules/wrap-ansi/index.js
• ./node_modules/y18n/index.mjs
• ./node_modules/bare-path/index.js
• ./node_modules/lodash.isboolean/index.js
• ./node_modules/text-hex/index.js
• ./node_modules/ignore/index.js
• ./node_modules/ignore/index.d.ts
• ./node_modules/file-uri-to-path/index.js
• ./node_modules/file-uri-to-path/index.d.ts
• ./node_modules/vitest/index.d.cts
• ./node_modules/vitest/index.cjs
• ./node_modules/assertion-error/index.js
• ./node_modules/assertion-error/index.d.ts
• ./node_modules/safe-buffer/index.js
• ./node_modules/safe-buffer/index.d.ts
• ./node_modules/kuler/index.js
• ./node_modules/function-bind/index.js
• ./node_modules/is-glob/index.js
• ./node_modules/to-arraybuffer/index.js
• ./node_modules/is-fullwidth-code-point/index.js
• ./node_modules/is-fullwidth-code-point/index.d.ts
• ./node_modules/color/index.js
• ./node_modules/ora/index.js
• ./node_modules/ora/index.d.ts
• ./node_modules/generic-pool/index.js
• ./node_modules/generic-pool/index.d.ts
• ./node_modules/querystringify/index.js
• ./node_modules/duck/index.js
• ./node_modules/json-bigint/index.js
• ./node_modules/psl/index.js
• ./node_modules/lodash.isinteger/index.js
• ./node_modules/jsonwebtoken/index.js
• ./node_modules/postgres-interval/index.js
• ./node_modules/postgres-interval/index.d.ts
• ./node_modules/color-name/index.js
• ./node_modules/es-define-property/index.js
• ./node_modules/es-define-property/index.d.ts
• ./node_modules/pg-pool/index.js
• ./node_modules/async/index.js
• ./node_modules/p-locate/index.js
• ./node_modules/p-locate/index.d.ts
• ./node_modules/undici/index.js
• ./node_modules/undici/index.d.ts
• ./node_modules/get-intrinsic/index.js
• ./node_modules/requires-port/index.js
• ./node_modules/one-time/index.js
• ./node_modules/fn.name/index.js
• ./node_modules/decompress-response/index.js
• ./node_modules/decompress-response/index.d.ts
• ./node_modules/simple-get/index.js
• ./node_modules/bun-types/index.d.ts
• ./node_modules/js-yaml/index.js
• ./node_modules/call-bound/index.js
• ./node_modules/call-bound/index.d.ts
• ./node_modules/js-tiktoken/index.js
• ./node_modules/js-tiktoken/index.d.ts
• ./node_modules/events-universal/index.js
• ./node_modules/lodash.isnumber/index.js
• ./node_modules/parent-module/index.js
• ./node_modules/hasown/index.js
• ./node_modules/hasown/index.d.ts
• ./node_modules/side-channel-weakmap/index.js
• ./node_modules/side-channel-weakmap/index.d.ts
• ./node_modules/tar-stream/index.js
• ./node_modules/deepmerge/index.js
• ./node_modules/deepmerge/index.d.ts
• ./node_modules/p-limit/index.js
• ./node_modules/p-limit/index.d.ts
• ./node_modules/bare-fs/index.js
• ./node_modules/bare-fs/index.d.ts
• ./node_modules/lodash.camelcase/index.js
• ./node_modules/mime-types/index.js
• ./node_modules/undici-types/index.d.ts
• ./node_modules/github-from-package/index.js
• ./node_modules/wsl-utils/index.js
• ./node_modules/wsl-utils/index.d.ts
• ./node_modules/json-schema-traverse/index.js
• ./node_modules/option/index.js
• ./node_modules/end-of-stream/index.js
• ./node_modules/bare-os/index.js
• ./node_modules/bare-os/index.d.ts
• ./node_modules/natural-compare/index.js
• ./node_modules/postgres-date/index.js
• ./node_modules/minimist/index.js
• ./node_modules/bare-url/index.js
• ./node_modules/bare-url/index.d.ts
• ./node_modules/pathval/index.js
• ./node_modules/is-stream/index.js
• ./node_modules/is-stream/index.d.ts
• ./node_modules/split2/index.js
• ./node_modules/universalify/index.js
• ./node_modules/onetime/index.js
• ./node_modules/onetime/index.d.ts
• ./node_modules/find-up/index.js
• ./node_modules/find-up/index.d.ts
• ./node_modules/deep-eql/index.js
• ./node_modules/bare-stream/index.js
• ./node_modules/bare-stream/index.d.ts
• ./node_modules/ansi-regex/index.js
• ./node_modules/ansi-regex/index.d.ts
• ./node_modules/mimic-response/index.js
• ./node_modules/mimic-response/index.d.ts
• ./node_modules/matcher/index.js
• ./node_modules/matcher/index.d.ts
• ./node_modules/siginfo/index.js
• ./node_modules/has-flag/index.js
• ./node_modules/has-flag/index.d.ts
• ./node_modules/supports-color/index.js
• ./node_modules/fs-minipass/index.js
• ./node_modules/sparse-bitfield/index.js
• ./node_modules/canvas/index.js
• ./node_modules/color-convert/index.js
• ./node_modules/path-key/index.js
• ./node_modules/path-key/index.d.ts
• ./node_modules/brace-expansion/index.js
• ./node_modules/logform/index.js
• ./node_modules/logform/index.d.ts
• ./node_modules/aproba/index.js
• ./node_modules/json-stable-stringify-without-jsonify/index.js
• ./node_modules/winston-transport/index.js
• ./node_modules/winston-transport/index.d.ts
• ./node_modules/redis-errors/index.js
• ./node_modules/get-caller-file/index.js
• ./node_modules/get-caller-file/index.js.map
• ./node_modules/get-caller-file/index.d.ts
• ./node_modules/word-wrap/index.js
• ./node_modules/word-wrap/index.d.ts
• ./node_modules/has-symbols/index.js
• ./node_modules/has-symbols/index.d.ts
• ./node_modules/ieee754/index.js
• ./node_modules/ieee754/index.d.ts
• ./node_modules/json-buffer/index.js
• ./node_modules/long/index.js
• ./node_modules/long/index.d.ts
• ./node_modules/default-browser-id/index.js
• ./node_modules/semver/index.js
• ./node_modules/define-properties/index.js
• ./node_modules/b4a/index.js
• ./node_modules/vite/index.d.cts
• ./node_modules/vite/index.cjs
• ./node_modules/node-abi/index.js
• ./node_modules/safe-stable-stringify/index.js
• ./node_modules/safe-stable-stringify/index.d.ts
• ./node_modules/ansi-styles/index.js
• ./node_modules/ansi-styles/index.d.ts
• ./node_modules/fast-uri/index.js
• ./node_modules/acorn-jsx/index.js
• ./node_modules/acorn-jsx/index.d.ts
• ./node_modules/graphql/index.js
• ./node_modules/graphql/index.mjs
• ./node_modules/graphql/index.d.ts
• ./node_modules/tr46/index.js
• ./node_modules/console-control-strings/index.js
• ./node_modules/fs.realpath/index.js
• ./node_modules/fast-fifo/index.js
• ./node_modules/get-east-asian-width/index.js
• ./node_modules/get-east-asian-width/index.d.ts
• ./node_modules/yocto-queue/index.js
• ./node_modules/yocto-queue/index.d.ts
• ./node_modules/lodash.merge/index.js
• ./node_modules/serialize-error/index.js
• ./node_modules/serialize-error/index.d.ts
• ./node_modules/url-parse/index.js
• ./node_modules/denque/index.js
• ./node_modules/denque/index.d.ts
• ./node_modules/side-channel/index.js
• ./node_modules/side-channel/index.d.ts
• ./node_modules/concat-map/index.js
• ./node_modules/gauge/index.js
• ./node_modules/protobufjs/index.js
• ./node_modules/protobufjs/index.d.ts
• ./node_modules/pump/index.js
• ./node_modules/get-stream/index.js
• ./node_modules/get-stream/index.d.ts
• ./node_modules/jszip/index.d.ts
• ./node_modules/restore-cursor/index.js
• ./node_modules/restore-cursor/index.d.ts
• ./node_modules/simple-concat/index.js
• ./node_modules/lodash.isplainobject/index.js
• ./node_modules/buffer-equal-constant-time/index.js
• ./node_modules/is-arrayish/index.js
• ./node_modules/pg-types/index.js
• ./node_modules/pg-types/index.test-d.ts
• ./node_modules/pg-types/index.d.ts
• ./node_modules/cliui/index.mjs
• ./node_modules/object-assign/index.js
• ./node_modules/replicate/index.js
• ./node_modules/replicate/index.d.ts
• ./node_modules/get-proto/index.js
• ./node_modules/get-proto/index.d.ts
• ./node_modules/form-data/index.d.ts
• ./node_modules/cross-spawn/index.js
• ./node_modules/yargs/index.cjs
• ./node_modules/yargs/index.mjs
• ./node_modules/asynckit/index.js
• ./node_modules/event-target-shim/index.d.ts
• ./node_modules/tar-fs/index.js
• ./node_modules/import-fresh/index.js
• ./node_modules/import-fresh/index.d.ts
• ./node_modules/delegates/index.js
• ./node_modules/dayjs/index.d.ts
• ./node_modules/default-browser/index.js
• ./node_modules/default-browser/index.d.ts
• ./node_modules/lodash.isarguments/index.js
• ./node_modules/object-keys/index.js
• ./node_modules/gopd/index.js
• ./node_modules/gopd/index.d.ts
• ./node_modules/is-unicode-supported/index.js
• ./node_modules/is-unicode-supported/index.d.ts
• ./node_modules/run-applescript/index.js
• ./node_modules/run-applescript/index.d.ts
• ./node_modules/why-is-node-running/index.js
• ./node_modules/string-width/index.js
• ./node_modules/string-width/index.d.ts
• ./node_modules/is-interactive/index.js
• ./node_modules/is-interactive/index.d.ts
• ./node_modules/streamx/index.js
• ./node_modules/bowser/index.d.ts
• ./node_modules/pg-connection-string/index.js
• ./node_modules/pg-connection-string/index.d.ts
• ./node_modules/stackback/index.js
• ./node_modules/cross-fetch/index.d.ts
• ./node_modules/log-symbols/index.js
• ./node_modules/log-symbols/index.d.ts
• ./node_modules/isarray/index.js
• ./node_modules/resolve-from/index.js
• ./node_modules/semver-compare/index.js
• ./node_modules/is-extglob/index.js
• ./node_modules/rc/index.js
• ./node_modules/cli-cursor/index.js
• ./node_modules/cli-cursor/index.d.ts
• ./node_modules/set-blocking/index.js
• ./node_modules/color-support/index.js
• ./node_modules/cli-spinners/index.js
• ./node_modules/cli-spinners/index.d.ts
• ./node_modules/lodash.defaults/index.js
• ./node_modules/deep-is/index.js
• ./node_modules/es-set-tostringtag/index.js
• ./node_modules/es-set-tostringtag/index.d.ts
• ./node_modules/cluster-key-slot/index.d.ts
• ./node_modules/globalthis/index.js
• ./node_modules/enabled/index.js
• ./node_modules/priorityqueuejs/index.js
• ./node_modules/side-channel-map/index.js
• ./node_modules/side-channel-map/index.d.ts
• ./node_modules/emoji-regex/index.js
• ./node_modules/emoji-regex/index.mjs
• ./node_modules/emoji-regex/index.d.ts
• ./node_modules/open/index.js
• ./node_modules/open/index.d.ts
• ./node_modules/object-inspect/index.js
• ./node_modules/tunnel-agent/index.js
• ./node_modules/detect-node/index.js
• ./node_modules/detect-node/index.esm.js
• ./node_modules/locate-path/index.js
• ./node_modules/locate-path/index.d.ts
• ./node_modules/mkdirp-classic/index.js
• ./node_modules/mkdirp/index.js
• ./node_modules/winston/index.d.ts
• ./node_modules/postgres-array/index.js
• ./node_modules/postgres-array/index.d.ts
• ./node_modules/expand-template/index.js
• ./node_modules/ws/index.js
• ./node_modules/fast-deep-equal/index.js
• ./node_modules/fast-deep-equal/index.d.ts
• ./node_modules/postgres-bytea/index.js
• ./node_modules/openai/index.d.mts
• ./node_modules/openai/index.js
• ./node_modules/openai/index.mjs.map
• ./node_modules/openai/index.mjs
• ./node_modules/openai/index.js.map
• ./node_modules/openai/index.d.ts
• ./node_modules/openai/index.d.ts.map
• ./node_modules/shebang-command/index.js
• ./node_modules/pg-cursor/index.js
• ./node_modules/napi-build-utils/index.js
• ./node_modules/napi-build-utils/index.md
• ./node_modules/require-from-string/index.js
• ./node_modules/process/index.js
• ./node_modules/bare-events/index.js
• ./node_modules/bare-events/index.d.ts
• ./node_modules/glob-parent/index.js
• ./node_modules/buffer/index.js
• ./node_modules/buffer/index.d.ts
• ./node_modules/mime-db/index.js
• ./node_modules/isexe/index.js
• ./node_modules/es-object-atoms/index.js
• ./node_modules/es-object-atoms/index.d.ts
• ./index.ts
• ./src/types/index.ts
• ./src/config/index.ts
• ./src/mcp/index.ts
• ./src/cli/index.ts


---

## 📊 Project Statistics

**Languages:**
• JavaScript/TypeScript: 39717 files
• Python: 1 files

**Estimated LOC:** 482675


---

## 🧭 Navigation Guide

### Quick File Location
- Use \`grep -r "pattern" src/\` to search source
- Use \`find . -name "*.ext"\` to locate by extension
- Check CLAUDE.md for project-specific context

### Common Directories
• **[object Object]/**
• **dist/**
• **docs/**: Documentation
• **mcp-servers/**
• **node_modules/**
• **plans/**
• **py/**
• **src/**: Source code
• **test-results/**
• **tests/**: Test files

---

## 💡 Usage Tips

**For Claude:**
1. Read this file first before exploring (saves tokens)
2. Use Grep/Glob tools for targeted searches
3. Reference specific paths from tree above
4. Check Important Files for config/docs

**Regenerate:**
```bash
~/.claude/hooks/project-navigator.sh generate
```

**Auto-update:** Index refreshes on major file changes (>10 files edited)
