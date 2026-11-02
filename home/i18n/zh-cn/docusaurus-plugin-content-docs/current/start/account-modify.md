---
id: account-modify  
title: 配置修改账户密码和加密密钥        
sidebar_label: 更新账户和密钥
---

## 更新账户

随包的 `sureness.yml` 只包含一个初始账号 `admin`，使用前请修改默认密码。实际部署的账号来源可能不同，请检查管理端实际挂载或使用的配置。

在 `sureness.yml` 中编辑已审查的账号，同时保留现有凭据、路由规则和其他配置。例如：

```yaml
account:
  - appId: reviewed-operator
    credential: replace-with-a-strong-password
    role: [admin]
```

不要用此示例覆盖生产配置。更改账号来源后重启。当前 2.0 开发版没有强制的 admin-only 管理边界：显式配置的 `user`、`guest` 或自定义角色可以访问当前 `resourceRole` 规则和接口检查所允许的路由，其中部分 `user` 规则允许写操作。请审查实际规则，只向可信身份授予角色；不要假定这些角色提供完整的资源或凭据隔离。

机器上报入口使用各自的规则。例如，随包的 OTLP 和 Alertmanager 上报规则允许 `user`；不要仅为恢复上报就将机器凭据替换为 admin token。详见[安全模型](../help/security_model)。

## OpenAPI 文档与 Swagger UI

生成的 OpenAPI 文档会列出全部路由、HTTP 方法、参数名与类型，以及所有请求和响应模型，等同于一份现成的攻击面地图，因此 HertzBeat 默认不对外提供：随包发布的 `application.yml` 中 `springdoc.api-docs.enabled` 与 `springdoc.swagger-ui.enabled` 均为 `false`，此时 `/v3/api-docs` 和 `/swagger-ui/index.html` 返回 404。

如果确实需要该文档，更新 `config` 目录下的 `application.yml` 文件显式开启：

```yaml
springdoc:
  api-docs:
    enabled: true
  swagger-ui:
    enabled: true
```

开启后，随包的 `resourceRole` 规则将文档接口限制为 `admin`。请先以管理员身份登录 HertzBeat Web 应用，再打开 `/swagger-ui/index.html`；同源请求可以使用已认证的浏览器会话。如果访问失败，请检查实际规则和显式的 `Authorization` 请求头。

没有有效会话时，请求 `/v3/api-docs/swagger-config` 会被拒绝并返回 `401`。随包的 `sureness.auths` 启用 Basic 和 JWT，默认不启用 Digest。只有显式启用 Digest 后，未认证请求才可能收到 `WWW-Authenticate: Digest` 质询，浏览器也可能弹出用户名密码框。随包的 OpenAPI 资源规则拒绝非 admin 账号访问。详见[认证方式](docker-deploy)。

也可以直接携带管理员令牌获取文档：

```shell
curl -H "Authorization: Bearer $YOUR_ADMIN_TOKEN" http://localhost:1157/v3/api-docs
```

> ⚠️ 不要把 OpenAPI 路径放回 `excludedResource`，否则完整接口文档会再次匿名开放。

## 更新安全密钥

> 此密钥为账户安全加密管理的密钥，需要更新为相同长度的你自定义密钥串。

更新 `config` 目录下的 `application.yml` 文件，修改 `sureness.jwt.secret` 参数为你自定义的相同长度的密钥串。

```yaml
sureness:
  jwt:
    secret: 'CyaFv0bwq2Eik0jdrKUtsA6bx4sDJeFV643R
             LnfKefTjsIfJLBa2YkhEqEGtcHDTNe4CU6+9
             8tVt4bisXQ13rbN0oxhUZR73M6EByXIO+SV5
             dKhaX0csgOCTlCxq20yhmUea6H6JIpSE2Rwp'
```

**重启 HertzBeat 浏览器访问 [http://ip:1157/](http://ip:1157/) 即可探索使用 HertzBeat**
