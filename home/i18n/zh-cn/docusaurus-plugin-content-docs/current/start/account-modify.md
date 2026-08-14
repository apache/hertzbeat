---
id: account-modify  
title: 配置修改账户密码和加密密钥        
sidebar_label: 更新账户和密钥
---

## 更新账户

Apache HertzBeat™ 默认内置三个用户账户,分别为 admin/hertzbeat tom/hertzbeat guest/hertzbeat
若需要新增删除修改账户或密码，可以通过配置 `sureness.yml` 实现，若无此需求可忽略此步骤
修改位于安装目录下的 `/hertzbeat/config/sureness.yml` 的配置文件，docker环境目录为`opt/hertzbeat/config/sureness.yml`，建议提前挂载映射
配置文件内容参考如下

```yaml

resourceRole:
  - /api/account/auth/refresh===post===[admin,user,guest]
  - /api/apps/**===get===[admin,user,guest]
  - /api/monitor/**===get===[admin,user,guest]
  - /api/monitor/**===post===[admin,user]
  - /api/monitor/**===put===[admin,user]
  - /api/monitor/**===delete==[admin]
  - /api/monitors/**===get===[admin,user,guest]
  - /api/monitors/**===post===[admin,user]
  - /api/monitors/**===put===[admin,user]
  - /api/monitors/**===delete===[admin]
  - /api/alert/**===get===[admin,user,guest]
  - /api/alert/**===post===[admin,user]
  - /api/alert/**===put===[admin,user]
  - /api/alert/**===delete===[admin]
  - /api/alerts/**===get===[admin,user,guest]
  - /api/alerts/**===post===[admin,user]
  - /api/alerts/**===put===[admin,user]
  - /api/alerts/**===delete===[admin]
  - /api/notice/**===get===[admin,user,guest]
  - /api/notice/**===post===[admin,user]
  - /api/notice/**===put===[admin,user]
  - /api/notice/**===delete===[admin]
  - /api/tag/**===get===[admin,user,guest]
  - /api/tag/**===post===[admin,user]
  - /api/tag/**===put===[admin,user]
  - /api/tag/**===delete===[admin]
  - /api/summary/**===get===[admin,user,guest]
  - /api/summary/**===post===[admin,user]
  - /api/summary/**===put===[admin,user]
  - /api/summary/**===delete===[admin]
  - /api/collector/**===get===[admin,user,guest]
  - /api/collector/**===post===[admin,user]
  - /api/collector/**===put===[admin,user]
  - /api/collector/**===delete===[admin]
  - /api/status/page/**===get===[admin,user,guest]
  - /api/status/page/**===post===[admin,user]
  - /api/status/page/**===put===[admin,user]
  - /api/status/page/**===delete===[admin]
  # OpenAPI 文档包含全部路由、参数与数据模型,等同于一份接口地图,
  # 因此按普通管理类资源收敛到 admin,不再匿名开放
  - /v3/api-docs/**===get===[admin]
  - /v3/api-docs.yaml===get===[admin]
  - /v3/api-docs.yaml/**===get===[admin]
  - /v2/api-docs/**===get===[admin]
  - /swagger-resources/**===get===[admin]

# 需要被过滤保护的资源,不认证鉴权直接访问
# /api/v1/source3===get 表示 /api/v1/source3===get 可以被任何人访问 无需登录认证鉴权
excludedResource:
  - /api/account/auth/**===*
  - /api/i18n/**===get
  - /api/apps/hierarchy===get
  - /api/push/**===*
  - /api/status/page/public/**===*
  # web ui resource
  - /===get
  - /dashboard/**===get
  - /monitors/**===get
  - /alert/**===get
  - /account/**===get
  - /setting/**===get
  - /passport/**===get
  - /status/**===get
  - /**/*.html===get
  - /**/*.js===get
  - /**/*.css===get
  - /**/*.ico===get
  - /**/*.ttf===get
  - /**/*.png===get
  - /**/*.gif===get
  - /**/*.jpg===get
  - /**/*.svg===get
  - /**/*.json===get
  - /**/*.woff===get
  - /**/*.eot===get
  # h2 database
  - /h2-console/**===*

# 用户账户信息
# 下面有 admin tom lili 三个账户
# eg: admin 拥有[admin]角色,密码为 hertzbeat 
# eg: tom 拥有[user],密码为 hertzbeat
# eg: lili 拥有[guest],明文密码为 hertzbeat, 加盐 123 后密码为 94C6B34E7A199A9F9D4E1F208093B489
account:
  - appId: admin
    credential: hertzbeat
    role: [admin]
  - appId: tom
    credential: hertzbeat
    role: [user]
  - appId: guest
    credential: hertzbeat
    role: [guest]
  - appId: lili
    # credential = MD5(password + salt)
    # plain password: hertzbeat
    # attention: digest authentication does not support salted encrypted password accounts
    credential: 94C6B34E7A199A9F9D4E1F208093B489
    salt: 123
    role: [user]
```

修改`sureness.yml`的如下**部分参数**：**[注意⚠️sureness配置的其它默认参数需保留]**

```yaml

# 用户账户信息
# 下面有 admin tom lili 三个账户
# eg: admin 拥有[admin,user]角色,密码为hertzbeat 
# eg: tom 拥有[user],密码为hertzbeat
# eg: lili 拥有[guest],明文密码为 hertzbeat, 加盐 123 后密码为 94C6B34E7A199A9F9D4E1F208093B489
account:
  - appId: admin
    credential: hertzbeat
    role: [admin]
  - appId: tom
    credential: hertzbeat
    role: [user]
  - appId: guest
    credential: hertzbeat
    role: [guest]
  - appId: lili
    # credential = MD5(password + salt)
    # plain password: hertzbeat
    # attention: digest authentication does not support salted encrypted password accounts
    credential: 94C6B34E7A199A9F9D4E1F208093B489
    salt: 123
    role: [user]
```

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
