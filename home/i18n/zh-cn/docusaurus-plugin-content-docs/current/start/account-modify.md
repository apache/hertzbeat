---
id: account-modify  
title: 配置修改账户密码和加密密钥        
sidebar_label: 更新账户和密钥
---

## 更新账户

发行包只提供初始 admin 账号，使用前应修改默认密码。从 1.9.1 起，管理 API 和界面仅支持精确的 admin 角色，这是有意的权限兼容性变更。升级前请阅读[必须执行的权限迁移](../help/admin_only_migration)。

先盘点 user/guest/自定义账号和自动化 token，再由部署方仅给确认可信的全实例运维人员手动授予 admin。不愿授予者不得继续访问管理面；升级不会自动提权、删除账号或生产用户数据。可先在测试环境验证。

仅编辑部署 sureness.yml 中经审查的账号，保留实际凭据，并合并发行包路由规则，不要复制旧的完整规则列表。例如：

```yaml
account:
  - appId: reviewed-operator
    credential: replace-with-a-strong-password
    role: [admin]
```

不要用此示例覆盖生产账号文件。修改文档账号源后重启。管理面角色与排除配置不能绕过后端 admin 校验。现有机器采集入口保留原认证政策，不要自动把机器凭据转成全实例 admin token。

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

开启之后，文档接口仍然被上面的 `resourceRole` 规则收敛在 `admin` 角色。请先以管理员身份登录 HertzBeat Web 应用，再打开 `/swagger-ui/index.html`；Swagger UI 会在同源的文档请求与 try-it-out 请求中附带 HertzBeat 保存的令牌，页面不会再要求任何输入。

没有该会话时文档同样不会泄露，但页面并非静默失败：`/swagger-ui/index.html` 是静态文件，仍然可以打开，而它请求 `/v3/api-docs/swagger-config` 会得到 `401` 与 `WWW-Authenticate: Digest` 挑战，浏览器因此弹出用户名密码框。在该弹框中输入管理员账号可以正常加载文档；没有 `admin` 角色的账号则会收到 `403`。

也可以直接携带管理员令牌获取文档：

```shell
curl -H "Authorization: Bearer $YOUR_ADMIN_TOKEN" http://localhost:1157/v3/api-docs
```

> ⚠️ 不要把 OpenAPI 路径放回 `excludedResource`。1.9.1 的后端管理权限检查仍会拒绝没有已认证 admin 身份的请求，因此这类排除规则会阻断管理员访问，不会开放匿名访问。

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
