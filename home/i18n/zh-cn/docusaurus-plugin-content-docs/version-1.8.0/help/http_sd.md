---
id: http_sd
title: 监控：HTTP服务发现监控
sidebar_label: HTTP服务发现
keywords: [开源监控系统, 开源服务发现监控, HTTP服务发现监控]
---

> HertzBeat 集成自定义 HTTP API，自动发现服务实例并为发现的实例创建监控任务。

### 概述

HTTP 服务发现允许 HertzBeat 通过调用您的自定义 HTTP API 来发现服务实例。这是最灵活的服务发现方式，适用于任何可以通过 HTTP API 暴露服务实例信息的系统。您只需提供一个返回指定格式目标地址列表的 HTTP 端点即可。

### 监控前操作

#### 准备 HTTP API

您需要提供或开发一个满足以下要求的 HTTP API：

1. **HTTP 方法**：支持 GET 请求
2. **响应格式**：返回 JSON 格式数组
3. **响应结构**：必须是数组格式，每个元素包含 `target` 字段（注意是单数），该字段为字符串数组，每个字符串是一个服务实例地址，格式为 `host:port`
4. **可访问性**：该 API 必须可从 HertzBeat 访问

#### API 响应示例

```json
[
  {
    "target": [
      "192.168.1.101:8080",
      "192.168.1.102:8080",
      "192.168.1.103:8080",
      "api.example.com:443"
    ]
  }
]
```

### 配置参数

|       参数名称       |                        参数帮助描述                         |
|------------------|-----------------------------------------------------|
| 任务名称             | 标识此监控的名称，名称需要保证唯一性                          |
| 服务发现地址           | 用于服务发现的 HTTP API 地址，必须以 http:// 或 https:// 开头。示例：`http://api.example.com/services` |
| 认证方式             | 认证方式，可选值：`Bearer Token`、`Basic Auth`、`Digest Auth`。默认：无 |
| 访问令牌             | 当认证方式为 Bearer Token 时用于认证的令牌                    |
| 用户名              | 当认证方式为 Basic Auth 或 Digest Auth 时用于认证的用户名          |
| 密码               | 当认证方式为 Basic Auth 或 Digest Auth 时用于认证的密码           |
| 采集间隔             | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                |
| 描述备注             | 更多标识和描述此监控的备注信息，用户可以在这里备注信息                     |

### 使用步骤

1. **准备 HTTP API**
   - 开发或配置一个返回服务实例列表的 API 端点
   - 确保 API 返回正确格式的 JSON 数据
   - 测试 API 的可访问性和响应格式

2. **创建服务发现监控**
   - 在 HertzBeat Web 界面中，导航到 **监控** → **新增监控**
   - 选择监控类型：**HTTP服务发现**
   - 填写基本配置参数
   - 根据需要配置认证信息

3. **配置监控模板**
   - 创建服务发现监控后，需要指定一个监控模板
   - 模板定义了为发现的服务实例创建什么类型的监控
   - 常用模板类型：端口、HTTP、HTTPS、Ping 等

4. **自动发现**
   - HertzBeat 会根据采集间隔定期调用您的 HTTP API
   - 为新发现的服务实例自动创建监控任务
   - 自动删除已消失服务实例的监控任务

### 使用示例

#### 示例 1：无需认证的 API

假设您有一个服务管理 API：

- **API 地址**：`http://service-manager.example.com/api/v1/services`
- **响应**：

  ```json
  [
    {
      "target": [
        "10.0.1.10:8080",
        "10.0.1.11:8080",
        "10.0.1.12:8080"
      ]
    }
  ]
  ```

配置示例：

- **任务名称**：`HTTP-Service-Discovery`
- **服务发现地址**：`http://service-manager.example.com/api/v1/services`
- **认证方式**：留空（无需认证）
- **采集间隔**：`60` 秒
- **监控模板**：选择 `端口` 监控

#### 示例 2：使用 Bearer Token 认证的 API

如果您的 API 需要 Bearer Token 认证：

- **API 地址**：`https://api.example.com/services`
- **认证方式**：`Bearer Token`
- **访问令牌**：`your-bearer-token-here`

配置示例：

- **任务名称**：`Secure-API-Discovery`
- **服务发现地址**：`https://api.example.com/services`
- **认证方式**：选择 `Bearer Token`
- **访问令牌**：输入您的令牌
- **监控模板**：选择 `HTTP` 监控

#### 示例 3：使用 Basic 认证的 API

如果您的 API 需要 Basic 认证：

- **API 地址**：`http://api.internal.com/discover`
- **认证方式**：`Basic Auth`
- **用户名**：`admin`
- **密码**：`password123`

配置示例：

- **任务名称**：`Basic-Auth-Discovery`
- **服务发现地址**：`http://api.internal.com/discover`
- **认证方式**：选择 `Basic Auth`
- **用户名**：`admin`
- **密码**：`password123`
- **监控模板**：选择合适的模板

### 注意事项

- **响应格式**：API 响应必须是 JSON 数组格式，每个元素包含 `target` 字段（注意是单数，字符串数组）
- **地址格式**：每个目标地址应为 `host:port` 格式，例如：
  - `192.168.1.100:8080`
  - `api.example.com:443`
  - `localhost:3000`
- **网络连通性**：确保 HertzBeat 可以访问 HTTP API 地址
- **监控模板**：服务发现仅发现服务实例地址，您需要配置合适的监控模板来实际监控这些实例
- **采集间隔**：根据 API 性能和服务变更频率设置合理的采集间隔
- **认证方式**：根据您的 API 安全要求选择合适的认证方式
- **HTTPS**：如果使用 HTTPS，确保 SSL 证书配置正确
- **API 性能**：确保 API 能够快速响应，避免影响 HertzBeat 性能
- **错误处理**：如果 API 返回错误或格式无效，HertzBeat 将保持当前监控任务不变

### 采集指标

#### 指标集合：监控目标

| 指标名称 | 指标单位 |    指标帮助描述     |
|------|-------|---------------|
| 目标   | 无     | 发现的服务实例目标    |
| 主机   | 无     | 服务实例主机地址      |
| 端口   | 无     | 服务实例端口号       |

### 适用场景

- **自定义注册中心**：与您自己的服务注册系统集成
- **云平台**：从云平台（AWS、GCP、Azure）发现服务
- **CMDB**：与 CMDB 系统集成获取服务信息
- **服务网关**：通过 API 网关发现服务实例
- **容器平台**：从 Kubernetes API 或容器编排平台获取服务列表
- **服务管理系统**：与现有服务管理平台集成
- **多云环境**：统一管理不同云平台的服务发现

### 高级用法

#### 包含额外元数据的响应

虽然基本要求只是 `target` 字段，但您的 API 可以包含额外的元数据以供未来扩展使用：

```json
[
  {
    "target": [
      "192.168.1.10:8080"
    ],
    "labels": {
      "env": "production",
      "version": "1.0.0"
    }
  }
]
```

注意：目前仅使用 `target` 字段进行服务发现，但未来版本可能支持使用标签信息。

### API 实现示例

#### Spring Boot 示例

```java
@RestController
@RequestMapping("/api/v1")
public class ServiceDiscoveryController {

    @GetMapping("/services")
    public List<Map<String, Object>> getServices() {
        List<String> targets = Arrays.asList(
            "192.168.1.10:8080",
            "192.168.1.11:8080",
            "192.168.1.12:8080"
        );

        Map<String, Object> response = new HashMap<>();
        response.put("target", targets);
        return Collections.singletonList(response);
    }
}
```

#### Node.js Express 示例

```javascript
app.get('/api/services', (req, res) => {
  const targets = [
    '192.168.1.10:8080',
    '192.168.1.11:8080',
    '192.168.1.12:8080'
  ];

  res.json([{
    target: targets
  }]);
});
```
