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

## 🚀 Main Updates

### Collection and Monitoring

- **Collection recovery**: resume collection safely after metric timeouts and preserve the previous collection job if a remote replacement fails.
- **Monitor operations**: correct bulk pause for large selections and handle empty metric rows on the monitor detail page.
- **Status history**: preserve existing history during daily status aggregation.

### Accounts and Credentials

- **Management access**: require `admin` for the management plane while retaining documented public and machine-ingestion policies.
- **Credential edits**: correct handling of masked monitor credentials; review destination changes and provide credentials again when required.
- **Configuration transfers**: monitor import and export require an administrator. Treat exported configuration as sensitive and validate imports and collection after upgrading.

## 🔄 Upgrade Notes

1. Read the [1.9.1 upgrade guide](/docs/start/1.9.1-update) and take a consistent backup of the database, configuration, custom templates and deployment files.
2. Review administrators and automation tokens, merge the shipped rules into custom configuration, and preserve existing secrets.
3. Upgrade the manager and any separately deployed collectors using matching 1.9.1 artifacts. Verify administrator access, representative monitoring, alert delivery and collector reconnection before returning to service.
4. If checks fail, follow the guide's rollback procedure and restore the appropriate pre-upgrade backup.

## 🙏 Acknowledgements

Thank you to everyone who contributed code, reported issues, reviewed changes, wrote documentation and verified the release candidate.

## 📞 Get Involved

- **GitHub**: [https://github.com/apache/hertzbeat](https://github.com/apache/hertzbeat)
- **Mailing Lists**: [https://hertzbeat.apache.org/docs/community/mailing_lists](https://hertzbeat.apache.org/docs/community/mailing_lists)
- **Discord**: [https://discord.gg/Fb6M73htGr](https://discord.gg/Fb6M73htGr)

---

*Apache HertzBeat, Apache, the Apache feather logo, and the HertzBeat name are trademarks of The Apache Software Foundation.*
