---
id: account-modify  
title: Modify Account Username Password And Secret        
sidebar_label: Update Account Secret
---

## Update Account

Apache HertzBeat™ default built-in three user accounts, respectively admin/hertzbeat tom/hertzbeat guest/hertzbeat
If you need add, delete or modify account or password, configure `sureness.yml`. Ignore this step without this demand.
Modify the following **part parameters** in sureness.yml：**[Note⚠️Other default sureness configuration parameters should be retained]**

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
  # The OpenAPI document is a map of every route, parameter and model, so it is
  # scoped like any other administrative resource instead of being anonymous
  - /v3/api-docs/**===get===[admin]
  - /v3/api-docs.yaml===get===[admin]
  - /v3/api-docs.yaml/**===get===[admin]
  - /v2/api-docs/**===get===[admin]
  - /swagger-resources/**===get===[admin]

# config the resource restful api that need bypass auth protection
# rule: api===method 
# eg: /api/v1/source3===get means /api/v1/source3===get can be access by anyone, no need auth.
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

# account info config
# eg: admin has role [admin,user], password is hertzbeat
# eg: tom has role [user], password is hertzbeat
# eg: lili has role [guest], plain password is lili, salt is 123, salted password is 1A676730B0C7F54654B0E09184448289
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

Modify the following **part parameters** in sureness.yml **[Note⚠️Other default sureness configuration parameters should be retained]**：

```yaml

# user account information
# Here is admin tom lili three accounts
# eg: admin has role [admin,user], password is hertzbeat
# eg: tom has role [user], password is hertzbeat
# eg: lili has role [guest], plain password is lili, salt is 123, salted password is 1A676730B0C7F54654B0E09184448289
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

## OpenAPI Document And Swagger UI

The generated OpenAPI document lists every route, http method, parameter name and type, and every request and response model. It is a ready made map of the attack surface, so HertzBeat does not serve it by default: `springdoc.api-docs.enabled` and `springdoc.swagger-ui.enabled` are both `false` in the shipped `application.yml`, which makes `/v3/api-docs` and `/swagger-ui/index.html` return 404.

If you need the document, opt in by updating the `application.yml` file in the `config` directory:

```yaml
springdoc:
  api-docs:
    enabled: true
  swagger-ui:
    enabled: true
```

Once enabled, the document endpoints are still scoped to the `admin` role by the `resourceRole` rules above. Sign in to the HertzBeat web application as an administrator before opening `/swagger-ui/index.html`; the Swagger UI attaches the stored HertzBeat token to its same-origin document and try-it-out requests, and the page loads without asking for anything.

Without that session the document is not exposed, but the page does not fail silently either. `/swagger-ui/index.html` is a static file and still loads; its request for `/v3/api-docs/swagger-config` is answered with `401` and a `WWW-Authenticate: Digest` challenge, so the browser asks for a username and password. Administrator credentials entered there let the document through, and an account without the `admin` role is answered with `403`.

The document can also be fetched directly with an administrator token:

```shell
curl -H "Authorization: Bearer $YOUR_ADMIN_TOKEN" http://localhost:1157/v3/api-docs
```

> ⚠️ Do not move the OpenAPI paths into `excludedResource`; doing so makes the complete document anonymous again.

## Update Security Secret

> This secret is the key for account security encryption management and needs to be updated to your custom key string of the same length.

Update the `application.yml` file in the `config` directory, modify the `sureness.jwt.secret` parameter to your custom key string of the same length.

```yaml
sureness:
  jwt:
    secret: 'CyaFv0bwq2Eik0jdrKUtsA6bx4sDJeFV643R
             LnfKefTjsIfJLBa2YkhEqEGtcHDTNe4CU6+9
             8tVt4bisXQ13rbN0oxhUZR73M6EByXIO+SV5
             dKhaX0csgOCTlCxq20yhmUea6H6JIpSE2Rwp'
```

**Restart HertzBeat, access [http://ip:1157/](http://ip:1157/) to explore**
