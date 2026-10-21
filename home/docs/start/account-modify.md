---
id: account-modify  
title: Modify Account Username Password And Secret        
sidebar_label: Update Account Secret
---

## Update Account

HertzBeat ships one initial admin account. Change its default password before use. Starting with 1.9.1, only the exact `admin` role can access the management API and UI. This is an intentional compatibility change; [review the required migration](../help/admin_only_migration) before upgrading.

Inventory existing user/guest/custom accounts and automation tokens. Manually grant admin only to identities confirmed to be trusted administrators of the whole instance. Others must not continue accessing management. The upgrade neither promotes accounts automatically nor deletes their data. Validate in a test environment first.

Edit only the reviewed accounts in your deployed `sureness.yml`, preserving your actual credentials and merging the shipped route rules instead of copying an outdated rule list. For example:

```yaml
account:
  - appId: reviewed-operator
    credential: replace-with-a-strong-password
    role: [admin]
```

Do not replace a production account file with this example. Restart after changing the account source. Management role/exclusion rules cannot override the server's admin check. Existing machine-ingestion rules retain their original policies; do not automatically convert machine credentials to full admin tokens.

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

Once enabled, the document endpoints are still scoped to the `admin` role by the shipped `resourceRole` rules and the backend management gate. Sign in to the HertzBeat web application as an administrator before opening `/swagger-ui/index.html`; the Swagger UI attaches the stored HertzBeat token to its same-origin document and try-it-out requests, and the page loads without asking for anything.

Without that session the document is not exposed, but the page does not fail silently either. `/swagger-ui/index.html` is a static file and still loads; its request for `/v3/api-docs/swagger-config` is answered with `401` and a `WWW-Authenticate: Digest` challenge, so the browser asks for a username and password. Administrator credentials entered there let the document through, and an account without the `admin` role is answered with `403`.

The document can also be fetched directly with an administrator token:

```shell
curl -H "Authorization: Bearer $YOUR_ADMIN_TOKEN" http://localhost:1157/v3/api-docs
```

> ⚠️ Do not move the OpenAPI paths into `excludedResource`. In 1.9.1 the backend management gate still denies requests without an authenticated admin subject, so an exclusion breaks administrator access instead of granting anonymous access.

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
