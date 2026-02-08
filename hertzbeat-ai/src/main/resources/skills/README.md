# AI SOP Engine

The AI SOP (Standard Operating Procedure) Engine enables defining and executing automated workflows through YAML configuration.

## Features

- **YAML-based Definition**: Define workflows declaratively
- **Multiple Step Types**: `tool` (call HertzBeat tools), `llm` (AI reasoning)
- **Unified Output**: Consistent result structure with `SopResult`
- **I18n Support**: Multi-language output (zh/en)
- **Multiple APIs**: Streaming (SSE), Sync (JSON), AI-friendly (Text)

## Quick Start

### 1. Define a Skill

Create `skills/my_skill.yml`:

```yaml
name: my_skill
description: "My custom skill"
version: "1.0"

output:
  type: report      # report/simple/data/action
  format: markdown
  language: zh      # zh/en

steps:
  - id: get_data
    type: tool
    tool: queryMonitors
    args:
      status: 9
      
  - id: analyze
    type: llm
    prompt: |
      Analyze: ${get_data}
```

### 2. Execute

```bash
# Streaming (SSE)
POST /api/ai/sop/execute/{skillName}

# Sync (JSON)
POST /api/ai/sop/execute/{skillName}/sync

# AI Format (Text)
POST /api/ai/sop/execute/{skillName}/ai
```

## Output Types

| Type | Use Case |
|------|----------|
| `report` | Daily inspection, analysis |
| `simple` | Restart, clear cache |
| `data` | Query, statistics |
| `action` | Pending confirmation |

## Architecture

```
YAML Definition → SkillRegistry → SopEngine → Executors → SopResult
                                      ↓
                               ToolExecutor / LlmExecutor
                                      ↓
                               ToolRegistry (auto-discover @Tool methods)
```

## Adding New Tools

Just add `@Tool` annotation to your method - no other code changes needed:

```java
@Tool(name = "myNewTool", description = "...")
public String myNewTool(@ToolParam(...) Long param) {
    // implementation
}
```

ToolRegistry auto-discovers all `@Tool` methods at runtime.
