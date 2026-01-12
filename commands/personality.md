---
description: Custom agent personalities and domain-specific configurations
argument-hint: "[action] [personality-name]"
allowed-tools: ["Read", "Write", "Edit"]
---

# Custom Personalities

Configure Claude's behavior, knowledge focus, and communication style for different domains and use cases.

**Backend**: `~/.claude/hooks/personality-loader.sh` (✅ Implemented)
**Status**: Working - 3 built-in personalities available

## Usage

```
/personality list
/personality load <name>
/personality create <name>
/personality edit <name>
/personality current
```

## Commands

### list
Show all available personalities

### load <name>
Switch to a personality profile

### create <name>
Create new custom personality

### edit <name>
Modify existing personality

### current
Show active personality

## Built-In Personalities (✅ Implemented)

### default
- Balanced general-purpose development
- Code quality and maintainability focus
- Pragmatic testing approach
- Moderate documentation

### security-expert
- Security-first development
- OWASP Top 10 and vulnerability assessment
- Always validates input, checks for injection attacks
- Threat modeling and defensive coding
- Comprehensive security documentation

### performance-optimizer
- Performance and scalability focus
- Profiling and benchmarking driven
- Considers Big O complexity and resource efficiency
- Optimizes hot paths and eliminates bottlenecks
- Metrics-focused documentation

### Additional Personalities (Can be created)

Use `/personality create <name>` to create custom personalities for:
- **api-architect**: API design, REST, GraphQL
- **frontend-specialist**: UI/UX, React/Vue
- **devops-engineer**: CI/CD, infrastructure
- **data-scientist**: Data analysis, ML

See personality YAML template for configuration options.

## Custom Personality Structure

```yaml
name: "custom-personality"
description: "Brief description"

focus:
  - Primary domain area
  - Secondary areas
  - Specific technologies

knowledge:
  frameworks: ["React", "Node.js"]
  patterns: ["Microservices", "Event-driven"]
  tools: ["Docker", "Kubernetes"]

behavior:
  communication_style: "concise"  # or "detailed", "beginner-friendly"
  code_style: "functional"  # or "oop", "procedural"
  testing_preference: "tdd"  # or "integration-first", "e2e-first"
  documentation_level: "comprehensive"  # or "minimal", "inline-only"

priorities:
  - Security
  - Performance
  - Maintainability
  - Speed of delivery

constraints:
  - "Never skip error handling"
  - "Always include tests"
  - "Prefer TypeScript over JavaScript"

prompts:
  pre_task: "Before starting, analyze security implications"
  post_task: "After completion, review for performance bottlenecks"
```

## Example Workflow

```bash
# Working on API development
/personality load api-architect

# Claude now focuses on:
# - RESTful design principles
# - API documentation
# - Versioning strategies
# - Error response standards

# Switch to security review
/personality load security-expert

# Claude now focuses on:
# - Authentication/authorization
# - Input validation
# - SQL injection prevention
# - XSS protection

# Create custom personality for your project
/personality create "ecommerce-specialist"
# ... configure focus areas

# Use it
/personality load ecommerce-specialist
```

## Features

- ✅ Multiple built-in personalities
- ✅ Custom personality creation
- ✅ YAML-based configuration
- ✅ Hot-swapping (switch without restart)
- ✅ Domain-specific knowledge emphasis
- ✅ Behavior modification
- ✅ Communication style adaptation

## Integration

- `/auto` - Personality affects autonomous behavior
- Memory system - Personality-specific memory channels
- All commands - Filtered through personality lens

## Use Cases

### Team Specialization
- Frontend dev uses frontend-specialist
- Backend dev uses api-architect
- Security team uses security-expert

### Project Phases
- Planning: architect personality
- Implementation: developer personality
- Testing: qa-specialist personality
- Deployment: devops-engineer personality

### Domain-Specific Projects
- Fintech: compliance-focused personality
- Healthcare: HIPAA-compliant personality
- Gaming: performance-optimizer personality
