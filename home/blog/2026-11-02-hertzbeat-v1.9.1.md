---
title: Announcement of Apache HertzBeat™ 1.9.1 Release
description: Apache HertzBeat 1.9.1 is a maintenance release with collection, credential and management access fixes. Read the upgrade guide before updating.
author: Apache HertzBeat Community
author_title: Apache HertzBeat Community
author_url: https://github.com/apache/hertzbeat
tags: [releases]
keywords: [open source monitoring system, alerting system, HertzBeat, release, v1.9.1, Apache]
cover_headline: Apache HertzBeat 1.9.1
---

Dear Community Members,

We are pleased to announce the release of Apache HertzBeat™ 1.9.1. This maintenance release builds on 1.9.0 with fixes for collection, monitor management, credentials and status history. It also changes management access, so please read the upgrade guide before updating.

## Downloads and Documentation

- **Download**: [Apache HertzBeat 1.9.1](/docs/download)
- **Documentation**: [Apache HertzBeat documentation](https://hertzbeat.apache.org/docs/)
- **Upgrade Guide**: [How to update to 1.9.1](/docs/start/1.9.1-update)
- **Source changes**: [Compare 1.9.0 with the 1.9.1 release source](https://github.com/apache/hertzbeat/compare/v1.9.0...0fe1c4c4e09cd2b08fee38969961648092d6b1cf)

## ⚠️ Read This Before Upgrading

:::caution Management access changes in 1.9.1

Only accounts with the exact `admin` role can sign in to the management UI and API. The bundled account source includes an initial `admin` account; change its default password. Existing `user`, `guest` and custom non-admin accounts are not promoted or deleted automatically. Review accounts and automation credentials, and manually grant `admin` only to trusted operators. Machine-ingestion endpoints retain their documented authentication rules; do not replace a machine credential with an admin token without reviewing its privileges.

Back up the database and deployment configuration, including `sureness.yml` and `common.secret`, and rehearse recovery before upgrading. Preserve the existing `common.secret` and merge the new configuration with your deployment settings. There are no new SQL migration files between 1.9.0 and the 1.9.1 release source, but credential migration can update existing data.

The shipped authentication configuration enables Basic and JWT; Digest is disabled by default and must be explicitly enabled if needed. See the [upgrade guide](/docs/start/1.9.1-update) for the full procedure and rollback steps.

:::

## 🚀 What's Changed

### More Reliable Collection

A monitoring platform is only useful when its collection jobs recover and keep running as expected. In 1.9.1, collection can recover safely after a metric timeout. For SSL certificate monitoring, a stalled TLS handshake now respects the configured timeout.

Collector scheduling also handles several lifecycle cases more carefully: repeated initialization or reconnection avoids duplicate active jobs for the same monitor; if a remote job replacement fails, the previous job is retained so the replacement can be retried; and deleting a monitor during rebalancing does not bring its job back.

### Monitor Management

- **Filtering**: name or keyword and label filters work together before pagination, so results are not limited to matches on the current page.
- **Bulk operations and details**: fixed bulk pause for large selections and handling of empty metric rows on the monitor detail page. See [#4458](https://github.com/apache/hertzbeat/pull/4458) and [#4464](https://github.com/apache/hertzbeat/pull/4464).
- **Service discovery**: deleting a discovery parent removes its matching child monitors and parameters without deleting unrelated monitors; errors roll the operation back.
- **Configuration transfer**: monitor import and export require an administrator. Exported configuration can contain sensitive encrypted credentials, so store and share it carefully.

### Alerts and Status History

When alerts are grouped, one member recovering no longer makes the group appear recovered while another member is still firing. Recovery is also delivered within the repeat interval without producing duplicate recovery events. Alert definition YAML export and import preserve supported fields through a round trip.

Daily status aggregation preserves existing history and counts. The aggregation tests also cover repeated runs and daylight-saving boundaries.

### Accounts and Credentials

The management UI and API now require the exact `admin` role. Public and machine-ingestion endpoints continue to follow their documented rules. Review automation separately: a machine credential does not necessarily need administrative access.

Masked monitor credentials can be retained when editing an existing configuration; when a destination changes, provide credentials again when prompted. For configured Webhook, Telegram, Discord and ntfy credentials, changing the corresponding destination requires explicit credential re-entry. An unchanged destination can retain its masked credential, and optional credentials that were never configured remain optional.

## 📦 Release Packages

The release includes source, server archives, a JVM collector, Docker Compose and native collector packages for Linux AMD64, Linux ARM64 and Windows AMD64. Select packages for your deployment from the [download page](/docs/download). Native collectors cannot load external JDBC drivers at runtime through `ext-lib`; use the appropriate JVM collector when those drivers are needed.

## 🔄 Upgrade to 1.9.1

1. **Plan and back up**: read the [upgrade guide](/docs/start/1.9.1-update), retain the 1.9.0 artifacts for rollback, and take a consistent database backup. Stop the service before copying an H2 database. Back up `application.yml`, `sureness.yml`, `common.secret`, certificates, custom `define/` and `ext-lib/` files, and deployment mounts and volumes.
2. **Review access and configuration**: grant `admin` manually only to trusted operators, change the initial admin password, preserve `common.secret`, and merge the new configuration with your existing settings. The shipped configuration disables Digest by default, but a mounted older `sureness.yml` may still enable it; check your actual configuration.
3. **Upgrade your deployment**: for an archive installation, unpack into a new directory and merge configuration rather than replacing only JARs; retain the 1.9.1 `bin/` and `lib/` directories. For Compose, preserve existing mounts and volumes; do not use `docker compose down -v` as an upgrade step. Use matching 1.9.1 manager and collector artifacts.
4. **Verify before returning to service**: check administrator access, representative monitors, alert delivery and remote collector reconnection. Check network access for the collectors that need it. Follow the guide if a rollback is needed: restoring the pre-upgrade database backup discards writes made after that backup.

There are no new SQL migration files between 1.9.0 and the 1.9.1 release source, but credential migration can update existing database data. Rehearse recovery for your deployment before upgrading.

## 🙏 Acknowledgements

Thank you to everyone who contributed code, reported issues, reviewed changes, wrote documentation and verified the release candidate.

## 📞 Get Involved

- **GitHub**: [https://github.com/apache/hertzbeat](https://github.com/apache/hertzbeat)
- **Mailing Lists**: [https://hertzbeat.apache.org/docs/community/mailing_lists](https://hertzbeat.apache.org/docs/community/mailing_lists)
- **Discord**: [https://discord.gg/Fb6M73htGr](https://discord.gg/Fb6M73htGr)

---

*Apache HertzBeat, Apache, the Apache feather logo, and the HertzBeat name are trademarks of The Apache Software Foundation.*
