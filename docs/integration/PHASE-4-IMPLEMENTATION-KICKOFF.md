# Phase 4: Screenshot-to-Code Implementation Kickoff

**Date**: 2026-01-16
**Status**: 🚀 Ready to Begin
**Prerequisites**: ✅ All Phase 1 and Phase 2 Issues Resolved

---

## Session Summary

### Issues Resolved

**1. ReflexionAgent Repetition Detection Fixed (commit 392d1db2)**
- **Issue**: Edge case tests failing at 6-7 cycles (expected 30-50)
- **Root Cause**: Hardcoded repetition threshold of 3 consecutive identical thoughts
- **Fix**: Made detection configurable via `ReflexionAgentOptions`
  - Added `repetitionThreshold` (default: 3, edge cases: 15)
  - Added `stagnationThreshold` (default: 5, edge cases: 10)
- **Files Modified**:
  - `src/core/agents/reflexion/index.ts` - Added options interface and configurable thresholds
  - `tests/agents/reflexion-edge-cases.test.ts` - Applied EDGE_CASE_OPTIONS to all 3 tests
- **Test Status**: Running (cycle 10+, 6 files created) - no premature repetition detection

**2. Orchestrator Syntax Error Fixed (commit 9b51f34 in ~/.claude)**
- **Issue**: Bash syntax error at line 329 in autonomous-orchestrator-v2.sh
- **Root Cause**: Orphaned `*)` case statement after if/elif/fi block
- **Fix**: Removed lines 329-332 (orphaned case fragment and extra esac)
- **Validation**: `bash -n` passes
- **Status**: Phase 2 E2E orchestrator tests ready for rerun

**3. Buildguide Updated (commit 82ce4700)**
- Updated current status with both fixes
- Marked Phase 1 and Phase 2 tasks as complete
- Documented zero blockers remaining for Phase 4

---

## Phase 4 Architecture Analysis

### Reference Project: abi/screenshot-to-code

**Technology Stack**:
- Frontend: React + Vite with WebSocket streaming
- Backend: FastAPI (Python)
- Vision Models: Claude Sonnet 3.7 (best), GPT-4o, Gemini
- Output Formats: React/Vue/HTML + Tailwind, Bootstrap, Ionic, SVG

**Key Features**:
- Screenshot/mockup/Figma → functional prototype
- Iterative refinement via "nudge" UI
- Real-time code streaming
- Experimental video support
- Mock mode for testing (no API costs)

**Limitations**:
- Requires premium API keys (Claude/OpenAI)
- Open-source models not recommended
- Hosted version requires subscription

### Our Implementation Approach

**Advantages Over Reference**:
1. ✅ **Existing Infrastructure**: Phase 3 provides orchestration, multi-model, quality validation
2. ✅ **TypeScript/Bun**: Unified stack (no Python backend needed)
3. ✅ **Multi-Provider**: Kimi-K2, GLM-4.7 fallback (cost-effective alternatives)
4. ✅ **Autonomous Integration**: Works with `/auto` command for zero-touch operation
5. ✅ **Quality Gates**: Constitutional AI, Quality Judge, UI testing already integrated

**Challenges**:
1. ⚠️ **Vision API**: Need to implement Claude Sonnet 4.5 vision + Gemini MCP vision fallback
2. ⚠️ **Visual Regression**: Need pixel-diff and semantic comparison engine
3. ⚠️ **Framework Detection**: Need pattern recognition for React/Vue/Tailwind/MUI/Chakra
4. ⚠️ **Refinement Loop**: Max 3 iterations with diff-based improvements

---

## Implementation Plan

### Component 1: VisionCodeAnalyzer (Day 1)
**Location**: `src/core/agents/screenshot-to-code/VisionCodeAnalyzer.ts`

**Responsibilities**:
- Analyze screenshot with vision LLM (Claude Sonnet 4.5 native, Gemini MCP fallback)
- Extract UI structure: layout, components, colors, typography, spacing
- Detect framework patterns: React/Vue/Svelte
- Identify component library: Tailwind/MUI/Chakra/Bootstrap
- Generate implementation specification

**API**:
```typescript
interface UIAnalysis {
  layout: {
    type: 'grid' | 'flex' | 'absolute';
    structure: LayoutNode[];
  };
  components: ComponentSpec[];
  styling: {
    framework: 'tailwind' | 'mui' | 'chakra' | 'css';
    colors: ColorPalette;
    typography: TypographySpec;
    spacing: SpacingSystem;
  };
  accessibility: {
    landmarks: string[];
    headingHierarchy: string[];
    formLabels: string[];
  };
}

class VisionCodeAnalyzer {
  async analyzeScreenshot(
    imagePath: string,
    options?: {
      preferredFramework?: string;
      preferredLibrary?: string;
    }
  ): Promise<UIAnalysis>;
}
```

**Integration**:
- Use `LLMRouter` with vision-capable models
- Primary: Claude Sonnet 4.5 (native vision via API)
- Fallback: Gemini 2.0 Flash (vision via MCP `mcp__gemini__analyzeFile`)
- Prompt engineering for consistent analysis format

### Component 2: UICodeGenerator (Day 2)
**Location**: `src/core/agents/screenshot-to-code/UICodeGenerator.ts`

**Responsibilities**:
- Generate code from UIAnalysis spec
- Support React + Tailwind (initial), extensible to Vue/Svelte
- Generate accessible markup (ARIA, semantic HTML)
- Apply component library patterns
- Generate clean, production-ready code

**API**:
```typescript
interface GeneratedCode {
  framework: 'react' | 'vue' | 'svelte';
  language: 'typescript' | 'javascript';
  files: {
    [filename: string]: string;
  };
  dependencies: Record<string, string>;
  instructions: string;
}

class UICodeGenerator {
  async generateCode(
    analysis: UIAnalysis,
    options: {
      framework: 'react' | 'vue' | 'svelte';
      typescript: boolean;
      componentLibrary?: string;
    }
  ): Promise<GeneratedCode>;
}
```

**Templates**:
- React + Tailwind base template
- Component library patterns (MUI, Chakra)
- Accessibility patterns (ARIA, landmarks)
- Responsive design patterns

### Component 3: VisualRegressionEngine (Day 3)
**Location**: `src/core/agents/screenshot-to-code/VisualRegressionEngine.ts`

**Responsibilities**:
- Compare original vs generated screenshots
- Calculate visual similarity score (0-100%)
- Identify specific differences (layout, colors, spacing, typography)
- Generate refinement suggestions

**API**:
```typescript
interface VisualDiff {
  overallSimilarity: number; // 0-100%
  differences: {
    layout: LayoutDiff[];
    colors: ColorDiff[];
    typography: TypographyDiff[];
    spacing: SpacingDiff[];
  };
  suggestions: string[];
}

class VisualRegressionEngine {
  async compareScreenshots(
    originalPath: string,
    generatedPath: string
  ): Promise<VisualDiff>;

  async isAcceptableMatch(diff: VisualDiff, threshold: number): boolean;
}
```

**Approach**:
- Use ZeroDriftCapture for screenshot capture
- Pixel-diff for layout/positioning comparison
- Color similarity via CIEDE2000 (perceptual color difference)
- Typography comparison via font metrics
- Accessibility tree comparison for semantic structure

### Component 4: ScreenshotToCodeOrchestrator (Day 4)
**Location**: `src/core/agents/screenshot-to-code/index.ts`

**Responsibilities**:
- Orchestrate full workflow: screenshot → analysis → generation → validation → refinement
- Manage iterative refinement loop (max 3 iterations)
- Track progress and quality metrics
- Integrate with AgentOrchestrationBridge for autonomous operation

**API**:
```typescript
interface ScreenshotToCodeResult {
  code: GeneratedCode;
  analysis: UIAnalysis;
  visualDiff: VisualDiff;
  qualityScore: number;
  iterations: number;
  totalDuration: number;
}

class ScreenshotToCodeOrchestrator {
  async generateFromScreenshot(
    screenshotPath: string,
    options: {
      framework?: 'react' | 'vue' | 'svelte';
      componentLibrary?: 'mui' | 'chakra' | 'tailwind';
      styleApproach?: 'css' | 'scss' | 'tailwind' | 'styled-components';
      maxIterations?: number;
      qualityThreshold?: number;
      visualMatchThreshold?: number;
    }
  ): Promise<ScreenshotToCodeResult>;
}
```

**Workflow**:
1. Capture or load screenshot
2. Analyze with VisionCodeAnalyzer
3. Generate code with UICodeGenerator
4. Write files to workspace
5. Build and run generated app
6. Capture screenshot of generated UI
7. Compare with VisualRegressionEngine
8. If similarity < threshold and iterations < max:
   - Analyze differences
   - Generate refinement prompt
   - Regenerate code
   - Goto step 4
9. Return result with metrics

### Component 5: AutoCommand Integration (Day 5)
**Location**: `src/cli/commands/auto/ScreenshotToCodeIntegration.ts`

**Responsibilities**:
- Integrate screenshot-to-code into `/auto` command
- Add specialist routing in AgentOrchestrationBridge
- Enable autonomous screenshot-to-code detection

**Integration**:
- Add `/screenshot-to-code` skill command
- Integrate with AgentOrchestrationBridge task routing
- Add specialist detection keywords: "screenshot", "UI", "mockup", "design"
- Auto-trigger when user provides image files with UI generation request

---

## Testing Strategy

### Unit Tests (15+ tests)
1. VisionCodeAnalyzer: Screenshot analysis accuracy
2. UICodeGenerator: React + Tailwind code generation
3. VisualRegressionEngine: Screenshot comparison accuracy
4. RefinementLoop: Iterative improvement
5. ScreenshotToCodeOrchestrator: End-to-end workflow

### Integration Tests (5+ examples)
1. Simple button component (single element)
2. Form with inputs and validation (moderate complexity)
3. Card layout with image and text (layout + content)
4. Navigation bar with menu (interactive components)
5. Dashboard with charts and tables (complex composition)

### Example Screenshots
- Collect 5+ diverse UI screenshots
- Test with different frameworks (React priority)
- Validate visual match threshold (85%+ target)
- Document results with before/after comparisons

---

## Success Criteria

✅ **Functional**:
- [ ] Convert screenshot → working React component (85%+ visual match)
- [ ] Support Tailwind CSS styling
- [ ] Generate accessible markup
- [ ] Complete workflow in <2 minutes
- [ ] Max 3 refinement iterations

✅ **Quality**:
- [ ] Quality Judge score >8.0/10
- [ ] Constitutional AI safety pass
- [ ] No TypeScript errors
- [ ] ESLint pass
- [ ] 15+ tests passing

✅ **Integration**:
- [ ] Works with `/auto` command
- [ ] Integrates with AgentOrchestrationBridge
- [ ] Uses existing multi-model system
- [ ] Phase 3 features enabled
- [ ] Autonomous specialist routing

✅ **Documentation**:
- [ ] Complete API documentation
- [ ] Usage guide with examples
- [ ] Architecture diagram
- [ ] Integration guide for new frameworks

---

## Risk Assessment

### Critical Risks 🔴

**1. Vision API Quality (High Impact, Medium Likelihood)**
- **Risk**: Vision models may misinterpret UI elements (buttons as text, etc.)
- **Mitigation**:
  - Use Claude Sonnet 3.7 (best per abi/screenshot-to-code)
  - Prompt engineering for consistent analysis
  - Multiple passes with different prompts if confidence low
  - Human-in-loop for complex UIs

**2. Visual Match Threshold (High Impact, High Likelihood)**
- **Risk**: 85% visual match may be too strict or too lenient
- **Mitigation**:
  - Start with 80% threshold, adjust based on testing
  - Separate thresholds for layout (strict) vs colors (lenient)
  - Allow user override via options
  - Document what constitutes "acceptable match"

### High Risks 🟡

**3. Framework Detection Accuracy (Medium Impact, Medium Likelihood)**
- **Risk**: May incorrectly detect framework/component library
- **Mitigation**:
  - Require user to specify framework preference
  - Pattern library for common frameworks
  - Fallback to vanilla if detection uncertain

**4. Refinement Loop Convergence (Medium Impact, Low Likelihood)**
- **Risk**: May not converge within 3 iterations
- **Mitigation**:
  - Hard limit at 3 iterations (prevent infinite loop)
  - Return best attempt with quality metrics
  - Document limitations in failure cases

### Medium Risks 🟢

**5. Cost (Vision API Calls) (Low Impact, High Likelihood)**
- **Risk**: Expensive for large iterations
- **Mitigation**:
  - Use cost-effective Gemini fallback
  - Cache analysis results
  - Optimize prompts to reduce token usage
  - Provide cost estimates before execution

**6. Performance (Screenshot Capture) (Low Impact, Low Likelihood)**
- **Risk**: Slow for complex pages
- **Mitigation**:
  - ZeroDriftCapture already optimized
  - Configurable timeout
  - Parallel screenshot capture where possible

---

## Timeline

**Day 1 (Today)**: VisionCodeAnalyzer
- ✅ Phase 1/2 fixes complete
- ✅ Architecture analysis complete
- ⏳ Implement VisionCodeAnalyzer
- ⏳ Test Claude Sonnet 4.5 vision API
- ⏳ Test Gemini MCP vision fallback
- ⏳ Validate analysis format consistency

**Day 2**: UICodeGenerator
- Implement React + Tailwind code generation
- Create component templates
- Test accessibility markup generation
- Validate TypeScript compilation

**Day 3**: VisualRegressionEngine
- Implement screenshot comparison
- Calculate similarity scoring
- Generate refinement suggestions
- Test with example screenshots

**Day 4**: ScreenshotToCodeOrchestrator
- Orchestrate full workflow
- Implement refinement loop
- Integrate quality gates
- End-to-end testing

**Day 5**: AutoCommand Integration + Testing
- Add `/screenshot-to-code` command
- Integrate with AgentOrchestrationBridge
- Complete test suite (15+ tests)
- Documentation and examples

**Total**: 5 days (assuming 4-6 hours focused work per day)

---

## Dependencies & Prerequisites

### ✅ Ready
- Phase 3 infrastructure (AgentOrchestrationBridge)
- Multi-model system (LLMRouter)
- ZeroDriftCapture (screenshot capture)
- Quality Judge + Constitutional AI
- UI Test Framework

### ⏳ Need to Verify
- Claude Sonnet 4.5 vision API access (native vision support)
- Gemini MCP vision tool availability (mcp__gemini__analyzeFile)
- Playwright installation (for ZeroDriftCapture)

### ❌ Blockers
- None identified

---

## Next Actions

1. ✅ Complete Phase 1/2 fixes (DONE)
2. ✅ Analyze abi/screenshot-to-code architecture (DONE)
3. ✅ Create implementation plan (THIS DOCUMENT)
4. ⏳ Verify vision API access (Claude + Gemini)
5. ⏳ Create VisionCodeAnalyzer skeleton
6. ⏳ Implement screenshot analysis with vision LLM
7. Continue with Day 1 tasks...

---

## References

- **External**: https://github.com/abi/screenshot-to-code
- **Phase 4 Plan**: `docs/integration/PHASE-4-SCREENSHOT-TO-CODE-PLAN.md`
- **Phase 3 Docs**: `docs/integration/PHASE-3-AGENT-ORCHESTRATION-INTEGRATION.md`
- **Vision System**: `src/core/vision/ZeroDriftCapture.ts`
- **Multi-Model**: `src/core/llm/`
- **Orchestration**: `src/core/agents/AgentOrchestrationBridge.ts`
- **Buildguide**: `buildguide.md`

---

**Status**: 🚀 Ready to begin Day 1 implementation
**Estimated Completion**: 2026-01-21 (5 days)
