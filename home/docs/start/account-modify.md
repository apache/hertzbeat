---
id: account-modify  
title: Modify Account Username Password And Secret        
sidebar_label: Update Account Secret
---

## Update Account

The bundled `sureness.yml` contains one initial account, `admin`. Change its default password before use. Your deployed account source can differ; review the configuration actually mounted or used by the manager.

Edit reviewed accounts in `sureness.yml` while preserving your existing credentials, route rules, and other configuration. For example:

```yaml
account:
  - appId: reviewed-operator
    credential: replace-with-a-strong-password
    role: [admin]
```

Do not replace a production configuration with this example. Restart after changing the account source. The current 2.0 development version does not enforce an admin-only management boundary: configured `user`, `guest`, or custom roles can access routes allowed by the active `resourceRole` rules and endpoint checks. Some `user` rules allow write operations. Review those rules and grant roles only to trusted identities; do not assume they provide complete resource or credential isolation.

Machine-ingestion routes have their own rules. For example, the shipped OTLP and Alertmanager ingestion rules allow `user`; do not replace machine credentials with an admin token merely to make ingestion work. See the [security model](../help/security_model).

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

Once enabled, the shipped `resourceRole` rules scope the document endpoints to `admin`. Sign in to the HertzBeat web application as an administrator before opening `/swagger-ui/index.html`; same-origin requests can use the authenticated browser session. If access fails, check the active rules and any explicit `Authorization` header.

Without a valid session, a request for `/v3/api-docs/swagger-config` is rejected with `401`. The shipped `sureness.auths` enables Basic and JWT; Digest is disabled by default. If Digest is explicitly enabled, an unauthenticated request may receive a `WWW-Authenticate: Digest` challenge and the browser may show a username/password prompt. A non-admin account is denied by the shipped OpenAPI resource rules. See [authentication modes](docker-deploy).

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
