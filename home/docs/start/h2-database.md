---
id: h2-database
title: Using H2 Database (Testing Only)
sidebar_label: H2 (Testing only)
---

Apache HertzBeat uses an embedded H2 database by default to store metadata (monitoring tasks, alarm data, configuration, etc.). This default is intended for quick start, demos, and local development.

:::caution Not for production
H2 is **not** designed to run in an adversarial environment, and HertzBeat's H2 usage is **not recommended for production deployments**.

If an attacker can access your H2 database (for example via an exposed H2 Web Console or any other path that allows executing SQL), H2 features such as `CREATE ALIAS` can be abused to execute arbitrary Java code and potentially take full control of the HertzBeat server.

For background, see the H2 security documentation: [H2 security documentation](https://h2database.com/html/security.html)
:::

## Recommendation for production

Use a production-grade database for HertzBeat metadata storage instead of H2:

- MySQL: [Use MYSQL Replace H2 Database to Store Metadata(Optional)](./mysql-change)
- PostgreSQL: [Use PostgreSQL Replace H2 Database to Store Metadata(Optional)](./postgresql-change)

## Safe ways to use H2 (sandbox only)

If you still choose to run HertzBeat with H2 for testing, keep the deployment sandboxed and minimize exposure:

1. Prefer **embedded/file mode** (the default) and avoid running H2 in TCP server mode.
2. Do **not** expose H2 endpoints to untrusted networks.
3. Treat the H2 data store as **ephemeral** (backup/export your HertzBeat configuration if you need it).

## Default datasource configuration (example)

Your `application.yml` typically looks similar to this when using H2:

```yaml
spring:
  datasource:
    driver-class-name: org.h2.Driver
    username: sa
    password: 123456
    url: jdbc:h2:./data/hertzbeat;MODE=MYSQL
    hikari:
      max-lifetime: 120000
```

> Notes
>
> - The defaults may vary by version and packaging.
> - If you run via Docker, you should mount the `data/` directory so your local test data persists.

## H2 Web Console (high risk)

H2 provides a Web Console that can execute SQL against your database. Enabling it makes it much easier to accidentally expose a powerful administrative surface.

:::danger Do not enable in production
Only enable the H2 console for local, temporary troubleshooting in a sandbox environment.
:::

To enable it, set:

```yaml
spring:
  h2:
    console:
      path: /h2-console
      enabled: true
```

### If you enable the console, lock it down

- Ensure it is only reachable from `localhost` or a tightly controlled admin network.
- Review your `sureness.yml`: many deployments configure `/h2-console/**` as an unauthenticated resource for convenience. Do not leave it publicly reachable.
- If you are behind a reverse proxy, restrict access by IP allowlist and/or additional authentication.
