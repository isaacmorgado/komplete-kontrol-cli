# Phase 4: Screenshot-to-Code Pipeline Integration Plan

**Date**: 2026-01-16
**Status**: 📋 Planning
**Priority**: High
**Complexity**: High (Vision + LLM + Code Generation + Validation)

## Executive Summary

Integrate screenshot-to-code pipeline leveraging existing Phase 3 infrastructure:
- **Vision**: ZeroDriftCapture (existing, Playwright-based)
- **Analysis**: Multi-model LLM with vision capabilities (Claude, Gemini)
- **Generation**: Code generation orchestration
- **Validation**: Quality Judge + UI testing (existing)
- **Iteration**: Visual regression until match

---

## Current State Assessment

### Existing Components ✅

1. **ZeroDriftCapture** (`src/core/vision/ZeroDriftCapture.ts`)
   - Playwright-based screenshot capture
   - DOM extraction with accessibility tree
   - Drift detection
   - Quality scoring

2. **Multi-Model System** (`src/core/llm/`)
   - 5+ LLM providers integrated
   - Claude Sonnet 4.5 (native vision support)
   - Gemini 2.0 Flash (via MCP)
   - Fallback chain with error handling

3. **AgentOrchestrationBridge** (`src/core/agents/AgentOrchestrationBridge.ts`)
   - Task routing to specialists
   - Phase 3 feature injection
   - Multi-agent coordination

4. **Quality Systems**
   - Quality Judge (LLM-as-Judge evaluation)
   - Constitutional AI (safety validation)
   - UI Test Framework (browser automation)

### Missing Components ❌

1. **Vision-to-Code Workflow**
   - No workflow for: screenshot → analysis → code generation
   - No iterative refinement loop
   - No visual regression comparison

2. **UI Code Generation Specialist**
   - No dedicated agent for UI implementation
   - No component library detection
   - No style/framework inference

3. **Visual Comparison Engine**
   - No automated screenshot comparison
   - No pixel-diff analysis
   - No semantic UI similarity scoring

---

## Architecture Design

### High-Level Flow

```
┌──────────────────────────────────────────────────────────────┐
│                  /screenshot-to-code                         │
│                                                              │
│  1. Capture Screenshot                                       │
│     ↓ ZeroDriftCapture                                      │
│  2. Analyze UI Structure                                     │
│     ↓ Vision LLM (Claude/Gemini)                            │
│  3. Detect Framework & Components                            │
│     ↓ Pattern Recognition                                    │
│  4. Generate Code                                            │
│     ↓ Code Generation Specialist                            │
│  5. Validate Quality                                         │
│     ↓ Quality Judge + Constitutional AI                     │
│  6. Test Implementation                                      │
│     ↓ UI Test Framework                                     │
│  7. Visual Regression Check                                  │
│     ↓ Screenshot Comparison                                 │
│  8. Iterate Until Match (max 3 iterations)                  │
│     ↓ Refinement Loop                                       │
│  9. Complete                                                │
└──────────────────────────────────────────────────────────────┘
```

### New Components to Implement

#### 1. ScreenshotToCodeOrchestrator

**Location**: `src/core/agents/screenshot-to-code/index.ts`

**Responsibilities**:
- Orchestrate screenshot → code workflow
- Manage iterative refinement
- Coordinate Vision + Code Generation + Validation
- Track progress and quality metrics

**API**:
```typescript
class ScreenshotToCodeOrchestrator {
  async generateFromScreenshot(
    screenshotPath: string,
    options: {
      framework?: 'react' | 'vue' | 'svelte' | 'vanilla';
      componentLibrary?: 'mui' | 'chakra' | 'tailwind';
      styleApproach?: 'css' | 'scss' | 'tailwind' | 'styled-components';
      maxIterations?: number;
      qualityThreshold?: number;
    }
  ): Promise<GeneratedCode>;

  async refineImplementation(
    originalScreenshot: string,
    currentCode: string,
    currentScreenshot: string
  ): Promise<RefinedCode>;
}
```

#### 2. VisionCodeAnalyzer

**Location**: `src/core/agents/screenshot-to-code/VisionCodeAnalyzer.ts`

**Responsibilities**:
- Analyze screenshot with vision LLM
- Extract UI structure, components, layout
- Detect framework patterns
- Generate implementation spec

**Integration**:
- Use existing multi-model system
- Prefer Claude Sonnet 4.5 (native vision)
- Fallback to Gemini 2.0 Flash (vision via MCP)

#### 3. UICodeGenerator

**Location**: `src/core/agents/screenshot-to-code/UICodeGenerator.ts`

**Responsibilities**:
- Generate code from analysis spec
- Support multiple frameworks (React, Vue, Svelte)
- Apply component library patterns
- Generate accessible markup

**Templates**:
```typescript
interface CodeTemplate {
  framework: string;
  componentLibrary?: string;
  generateComponent(spec: UISpec): string;
  generateStyles(spec: StyleSpec): string;
}
```

#### 4. VisualRegressionEngine

**Location**: `src/core/agents/screenshot-to-code/VisualRegressionEngine.ts`

**Responsibilities**:
- Compare original vs generated screenshots
- Calculate visual similarity score
- Identify visual differences
- Suggest refinements

**Approach**:
- Pixel-diff for layout/positioning
- Semantic comparison for colors/typography
- Component-level matching
- Accessibility tree comparison

#### 5. RefinementLoop

**Location**: `src/core/agents/screenshot-to-code/RefinementLoop.ts`

**Responsibilities**:
- Iterate on implementation until match
- Apply incremental fixes
- Track refinement history
- Prevent infinite loops (max 3 iterations)

---

## Implementation Plan

### Step 1: Vision Analysis Integration (1 day)

**Tasks**:
1. Create VisionCodeAnalyzer
2. Integrate with multi-model system
3. Test Claude Sonnet 4.5 vision API
4. Test Gemini 2.0 Flash MCP vision
5. Implement analysis prompt engineering

**Deliverable**: Working vision analysis that outputs UI spec

### Step 2: Code Generation (1 day)

**Tasks**:
1. Create UICodeGenerator
2. Implement React template
3. Add Tailwind CSS support
4. Create component detection logic
5. Test code generation quality

**Deliverable**: Generate React + Tailwind code from UI spec

### Step 3: Visual Regression (1 day)

**Tasks**:
1. Create VisualRegressionEngine
2. Implement screenshot comparison
3. Calculate similarity scoring
4. Generate diff reports
5. Test with various UIs

**Deliverable**: Automated visual comparison with scoring

### Step 4: Orchestration & Refinement (1 day)

**Tasks**:
1. Create ScreenshotToCodeOrchestrator
2. Implement RefinementLoop
3. Integrate all components
4. Add quality validation
5. Test end-to-end workflow

**Deliverable**: Complete screenshot-to-code pipeline

### Step 5: AutoCommand Integration (0.5 days)

**Tasks**:
1. Add `/screenshot-to-code` command
2. Integrate with AgentOrchestrationBridge
3. Enable autonomous operation
4. Add to AutoCommand routing

**Deliverable**: `/auto` can autonomously convert screenshots to code

### Step 6: Testing & Documentation (0.5 days)

**Tasks**:
1. Write integration tests
2. Create example screenshots
3. Document workflow
4. Add usage examples

**Deliverable**: Full documentation + tests

---

## Technical Decisions

### Vision Provider Selection

**Primary**: Claude Sonnet 4.5
- Native vision support
- Best-in-class UI understanding
- Excellent at component detection
- Available via existing ModelFallbackChain

**Fallback**: Gemini 2.0 Flash
- Vision via Gemini MCP server
- Fast inference
- Good cost/performance ratio

### Framework Support

**Phase 1**: React + Tailwind CSS
- Most popular stack
- Easiest to validate
- Component libraries: Material-UI, Chakra UI

**Phase 2**: Vue, Svelte, Vanilla JS
- Add after React validation

### Iteration Strategy

**Max Iterations**: 3
- Iteration 1: Generate from scratch
- Iteration 2: Refine major issues
- Iteration 3: Polish minor details
- Stop if quality > 85% or max iterations reached

### Quality Metrics

**Visual Similarity Score** (0-100):
- Layout match: 30%
- Color accuracy: 20%
- Typography: 20%
- Component structure: 20%
- Accessibility: 10%

**Acceptance Threshold**: 85%

---

## Integration Points

### With Existing Systems

1. **AgentOrchestrationBridge**
   - Route screenshot-to-code tasks to specialist
   - Inject Phase 3 features (quality, safety, vision)

2. **AutoCommand**
   - Detect screenshot-to-code tasks
   - Spawn ScreenshotToCodeOrchestrator
   - Track progress autonomously

3. **Quality Judge**
   - Validate generated code quality
   - Check accessibility
   - Ensure best practices

4. **Constitutional AI**
   - Safety validation
   - Prevent insecure patterns
   - Ensure ethical code generation

5. **UI Test Framework**
   - Test generated implementation
   - Capture comparison screenshot
   - Validate functionality

---

## Risk Assessment

### High Risks 🔴

1. **Vision LLM Accuracy**
   - Risk: Misinterpret UI structure
   - Mitigation: Use Claude Sonnet 4.5 (best vision), DOM extraction fallback

2. **Iteration Loop Runaway**
   - Risk: Never converge to acceptable quality
   - Mitigation: Max 3 iterations, quality threshold exit condition

3. **Framework Detection Errors**
   - Risk: Generate wrong framework code
   - Mitigation: User can specify framework, detection is optional

### Medium Risks 🟡

4. **Performance (Screenshot Capture)**
   - Risk: Slow screenshot capture for complex pages
   - Mitigation: ZeroDriftCapture already optimized, configurable timeout

5. **Cost (Vision API Calls)**
   - Risk: Expensive for large iterations
   - Mitigation: Use cost-effective Gemini fallback, cache analysis

### Low Risks 🟢

6. **Integration Complexity**
   - Risk: Many moving parts
   - Mitigation: Existing Phase 3 infrastructure handles orchestration

---

## Success Criteria

✅ **Functional**:
- Convert screenshot → working React component (85%+ visual match)
- Support Tailwind CSS styling
- Generate accessible markup
- Complete workflow in <2 minutes

✅ **Quality**:
- Quality Judge score >8.0/10
- Constitutional AI safety pass
- No TypeScript errors
- ESLint pass

✅ **Integration**:
- Works with `/auto` command
- Integrates with AgentOrchestrationBridge
- Uses existing multi-model system
- Phase 3 features enabled

✅ **Testing**:
- 15+ integration tests
- 5+ example screenshots validated
- Documentation complete
- Usage guide published

---

## Next Steps

1. **Immediate**: Create VisionCodeAnalyzer skeleton
2. **Day 1**: Implement vision analysis with Claude/Gemini
3. **Day 2**: Build UICodeGenerator for React + Tailwind
4. **Day 3**: Create VisualRegressionEngine
5. **Day 4**: Orchestrate full pipeline + refinement loop
6. **Day 5**: Integrate with AutoCommand + testing

**Estimated Timeline**: 4-5 days
**Dependencies**: None (all Phase 3 infrastructure ready)
**Blockers**: None identified

---

## References

- **Phase 3 Docs**: `docs/integration/PHASE-3-AGENT-ORCHESTRATION-INTEGRATION.md`
- **Vision System**: `src/core/vision/ZeroDriftCapture.ts`
- **Multi-Model**: `src/core/llm/`
- **Orchestration**: `src/core/agents/AgentOrchestrationBridge.ts`
