---
title: Announcement of Apache HertzBeat™ 1.9.0 Release
description: Apache HertzBeat 1.9.0 brings the native collector, SOP-driven AI workflows, Apache Doris storage and virtual threads, along with breaking changes that require the upgrade guide.
author: Apache HertzBeat Community
author_title: Apache HertzBeat Community
author_url: https://github.com/apache/hertzbeat
tags: [releases]
keywords: [open source monitoring system, alerting system, HertzBeat, release, v1.9.0, Apache]
cover_headline: Apache HertzBeat 1.9.0
---

Dear Community Members,

We are pleased to announce the official release of Apache HertzBeat™ 1.9.0! This release merges 228 pull requests from 37 contributors, 23 of whom contributed to HertzBeat for the first time.

It is a dense release. The native collector frees the collection side from the JVM, SOP-driven AI workflows push conversational operations a long way forward, and the storage layer gains Apache Doris and a MySQL R2DBC engine. At the same time, **1.9.0 contains breaking changes**, so please read the upgrade guide before you start.

## Downloads and Documentation

- **Apache HertzBeat™ 1.9.0 Download Link**: [https://hertzbeat.apache.org/docs/download](https://hertzbeat.apache.org/docs/download)
- **Apache HertzBeat™ Documentation**: [https://hertzbeat.apache.org/docs/](https://hertzbeat.apache.org/docs/)
- **Release Notes**: [https://github.com/apache/hertzbeat/releases/tag/v1.9.0](https://github.com/apache/hertzbeat/releases/tag/v1.9.0)
- **Upgrade Guide**: [How to update to 1.9.0](https://hertzbeat.apache.org/docs/start/1.9.0-update)

## ⚠️ Read This Before Upgrading

:::danger This release contains breaking changes

1.9.0 is **not** a drop-in replacement for the 1.8.x jar or image. The following all changed incompatibly:

- **Runtime**: the minimum requirement moves up to Java 25
- **Manager configuration**: the JPA implementation switches from EclipseLink to Hibernate, so `application.yml` needs adjusting
- **Authorization rules**: `sureness.yml` changed, and deployments that customized it need to merge
- **Collector credentials**: the AES ciphertext format changed, so **every collector must be upgraded to 1.9.0 before the manager is**
- **GreptimeDB**: the table schema changed, the `body` column of `hertzbeat_logs` moves from JSON to STRING, and the self-monitoring tables were renamed
- **Alerting semantics**: periodic threshold rules, null handling in realtime threshold rules, periodic alert silence and alert group convergence all changed
- **Removed**: push-style monitoring and the template marketplace

For the full impact assessment, migration steps and rollback plan, read [how to update to 1.9.0](https://hertzbeat.apache.org/docs/start/1.9.0-update).

:::

## 🚀 Major Updates

### Collector

- **Native collector** (#4066): built with GraalVM Native Image and published for `linux-amd64`, `linux-arm64` and `windows-amd64`, with faster startup and lower memory use. The trade-off is that packages are platform-specific and do not support loading JDBC drivers from `ext-lib` at runtime. See the [Native Collector Guide](https://hertzbeat.apache.org/docs/start/native-collector)
- **Virtual threads**: blocking executors migrated to virtual threads (#4062)
- **Time expressions**: HTTP collection resolves time expressions in URLs and headers (#4334)
- **Stability fixes**: honor the charset declared by XML responses (#4167), and close the JDBC connection when statement creation fails (#4184)

### AI Capabilities

- **SOP-driven AI workflows** (#4016): skills, scheduling and i18n support
- **Ollama monitoring** (#4064) and **LM Studio monitoring** (#4082) for local LLM runtimes
- **Spring AI alignment**: replaced the deprecated Tool API (#4206) with `MethodToolCallbackProvider` (#4234)
- **AI-assisted monitor creation**: streamlined flow (#3922)

### Storage and Query

- **Apache Doris** (#4031) as time-series storage for both metrics and logs
- **MySQL R2DBC query engine** (#4074)
- **VictoriaMetrics cluster** query executor (#4103)
- **GreptimeDB**: pre-create the `hertzbeat_logs` table during initialization (#4231), and form-urlencode the SQL request body (#4223)
- **Graceful degradation**: observability consoles degrade instead of failing when the storage lacks log, trace or metric support (#4233)

### Monitoring Coverage

- **etcd monitoring** (#4306)
- **Database account metrics**: SQL Server account expiry (#4141) and PostgreSQL database accounts (#4131)
- **Nacos service discovery**: auth and filtering parameters (#4099), Nacos client upgraded to 3.1.1 (#4061)
- **Monitor definitions**: edit definitions in place and simplify metric selection (#4158)
- **Pagination** for the monitoring metrics data table (#4309)

### Alerting and Notification

- **ntfy** added as an alert notification channel (#4132)
- **Alibaba Cloud Monitor** webhook support (#4296)
- **Notification template preview** (#4338)
- **Export alerts to Excel** (#4332)
- **Email server**: an SSL certificate verification toggle (#4327)
- **Hardening**: mask secret fields of notice receivers in REST API responses (#4220), and reject masked receiver edits when the stored receiver does not exist (#4225)

### Status Page

- Configurable time range for component history (#4222)
- History extended to 365 days (#4333)

### Security and Dependencies

- **API token management** (#4080)
- **grpc-java** bumped from 1.56.1 to 1.76.3 (#4211)
- **License material**: `material/licenses` re-synced with the dependencies actually bundled (#4336)

### UI and Internationalization

- **Korean** i18n support (#4197)
- Styling improvements for the login page (#4044), the monitor list (#4138), status page settings (#4139) and the template editor (#4051)
- The dashboard hides empty category cards and shows an empty state (#4242)

## 🌟 Community Growth

This release welcomes 23 new contributors to the Apache HertzBeat community:

- @turanalmammadov
- @miantalha45
- @04cb
- @Darshan-paul
- @brettgervasoni
- @zhehenlu
- @zhusaidong
- @neon-hippo
- @abhyudayareddy
- @wilmerdooley
- @wy471x
- @Zmjjeff7
- @hutiefang76
- @orangeCatDeveloper
- @ZhouYinLong-lab
- @moduvoice
- @hengyuss
- @paultanay
- @fas89
- @Bhavya-Sonigra
- @DSingh0304
- @nikhiln64
- @Prabal864

## 📊 Statistics

This release includes:

- **228 pull requests** merged
- **37 contributors**, **23 of them new**
- **100+ bug fixes**
- **30+ new features**
- **20+ improvements and refactors**

## 🔄 Upgrade Notes

:::caution

Read [how to update to 1.9.0](https://hertzbeat.apache.org/docs/start/1.9.0-update) in full, confirm the impact and take backups before running the steps below. The guide covers upgrading from a released 1.8.x only; if you are on 1.6.x or 1.7.x, step up to 1.8.x first.

:::

### Docker Deployment

```bash
# Stop and remove the existing container
docker stop hertzbeat
docker rm hertzbeat

# Pull the new version
docker pull apache/hertzbeat:1.9.0

# Run the new container
docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat:1.9.0
```

Mind the order: 1.9.0 changed the AES ciphertext format for monitor credentials, a 1.8.x collector cannot decrypt the passwords a 1.9.0 manager hands it, and the handshake does not check versions. A mismatch surfaces only as AES decryption errors in the collector log, while the monitor side looks like the target service rejected the credentials, which is easy to mistake for a wrong password. Upgrade every collector to 1.9.0 first (a 1.9.0 collector decrypts 1.8.x ciphertext fine and works against an older manager), then upgrade the manager.

### Package Deployment

1. Make sure the runtime provides **Java 25**
2. Download the 1.9.0 package from the [download page](https://hertzbeat.apache.org/docs/download)
3. Back up the existing configuration and database
4. Adjust `application.yml` and `sureness.yml` as the upgrade guide describes
5. Extract the new package over the installation and restart the HertzBeat service

If you do not need external JDBC drivers from `ext-lib`, consider the native collector package for faster startup and lower memory use.

### Kubernetes / Helm Deployment

Update the Helm chart to the new version:

```yaml
image:
  tag: "1.9.0"
```

## 🔮 Looking Ahead

The Apache HertzBeat community is working on:

- Building on the performance headroom from the native collector and virtual threads
- Deepening AI and SOP workflows for incident handling
- Expanding the choice of time-series and log storage backends
- Continuing to polish the observability consoles

## 🙏 Acknowledgements

Thanks to everyone who made this release possible:

- Every code contributor who opened a pull request
- Users who reported issues, provided reproductions and gave feedback
- Documentation writers and translators
- The PMC members and committers who verified and voted on the release candidate
- The Apache Software Foundation for its continued support

## 📞 Get Involved

- **GitHub**: [https://github.com/apache/hertzbeat](https://github.com/apache/hertzbeat)
- **Mailing Lists**: [https://hertzbeat.apache.org/docs/community/mailing_lists](https://hertzbeat.apache.org/docs/community/mailing_lists)
- **Discord**: [https://discord.gg/Fb6M73htGr](https://discord.gg/Fb6M73htGr)
- **Documentation**: [https://hertzbeat.apache.org/docs/](https://hertzbeat.apache.org/docs/)

## 📋 Full Changelog

For the complete list of changes, see the [full changelog](https://github.com/apache/hertzbeat/compare/1.8.0...v1.9.0).

---

**Download Apache HertzBeat™ 1.9.0 today for a lighter collector and smarter alerting!**

*Apache HertzBeat, Apache, the Apache feather logo, and the HertzBeat name are trademarks of The Apache Software Foundation.*
