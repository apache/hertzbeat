# AI SOP 引擎

AI SOP（标准操作流程）引擎支持通过 YAML 配置定义和执行自动化工作流。

## 功能特性

- **YAML 声明式定义**：通过配置文件定义工作流
- **多步骤类型**：`tool`（调用 HertzBeat 工具）、`llm`（AI 推理）
- **统一输出**：使用 `SopResult` 统一结果结构
- **国际化支持**：多语言输出（中文/英文）
- **多种 API**：流式（SSE）、同步（JSON）、AI 友好（纯文本）

## 快速开始

### 1. 定义技能

创建 `skills/my_skill.yml`：

```yaml
name: my_skill
description: "我的自定义技能"
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
      分析以下数据: ${get_data}
```

### 2. 执行

```bash
# 流式输出（SSE）
POST /api/ai/sop/execute/{skillName}

# 同步返回（JSON）
POST /api/ai/sop/execute/{skillName}/sync

# AI 格式（纯文本）
POST /api/ai/sop/execute/{skillName}/ai
```

## 输出类型

| 类型 | 使用场景 |
|------|---------|
| `report` | 日常巡检、故障分析 |
| `simple` | 重启服务、清理缓存 |
| `data` | 查询资源、统计信息 |
| `action` | 需要人工确认的操作 |

## 架构

```
YAML 定义 → SkillRegistry → SopEngine → Executors → SopResult
                                ↓
                         ToolExecutor / LlmExecutor
                                ↓
                         ToolRegistry（自动发现 @Tool 方法）
```

## 添加新工具

只需添加 `@Tool` 注解，无需修改其他代码：

```java
@Tool(name = "myNewTool", description = "...")
public String myNewTool(@ToolParam(...) Long param) {
    // 实现逻辑
}
```

ToolRegistry 会在运行时自动发现所有 `@Tool` 方法。

## 配置说明

### output 配置

| 字段 | 说明 | 可选值 |
|-----|------|-------|
| type | 输出类型 | report/simple/data/action |
| format | 格式 | markdown/json/text |
| language | 语言 | zh（中文）/en（英文） |
| contentStep | 内容步骤 | 步骤 ID |
