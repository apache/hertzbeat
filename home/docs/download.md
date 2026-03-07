---
id: download
title: Download Apache HertzBeat - Latest Release
sidebar_label: Download
description: Download Apache HertzBeat monitoring system - server, collector, source code, and Docker Compose packages with signatures and checksums.
---

## How to Download HertzBeat?

Download the latest Apache HertzBeat™ release (v1.8.0) as server binary, collector binary, source code, or Docker Compose package. All releases include GPG signatures and SHA512 checksums for verification.

**Latest Version:** v1.8.0 (Released: February 5, 2026)

**Quick Download:**
- [Server Binary](https://www.apache.org/dyn/closer.lua/hertzbeat/1.8.0/apache-hertzbeat-1.8.0-bin.tar.gz)
- [Collector Binary](https://www.apache.org/dyn/closer.lua/hertzbeat/1.8.0/apache-hertzbeat-collector-1.8.0-bin.tar.gz)
- [Source Code](https://www.apache.org/dyn/closer.lua/hertzbeat/1.8.0/apache-hertzbeat-1.8.0-src.tar.gz)

## Download Package Types

| Package Type | Size | Purpose | Platform |
|-------------|------|---------|----------|
| **Server Binary** | ~200MB | Main monitoring server | Linux, macOS, Windows |
| **Collector Binary** | ~50MB | Distributed collectors | Linux, macOS, Windows |
| **Source Code** | ~30MB | Build from source | Any with Java 17+ |
| **Docker Compose** | ~5MB | Full stack deployment | Docker environments |

:::tip Security Verification
Verify downloads using GPG signatures and SHA512 checksums. See [Apache Verification Guide](https://www.apache.org/dyn/closer.cgi#verify) and [HertzBeat KEYS](https://downloads.apache.org/hertzbeat/KEYS).
:::

## Latest Release (Recommended)

:::tip Security Notice
Previous releases may contain security vulnerabilities. Always use the latest version.
:::

| Version | Date       | Download                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Release                                                         |
|---------|------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------|
| v1.8.0  | 2026.02.05 | [apache-hertzbeat-1.8.0-bin.tar.gz](https://www.apache.org/dyn/closer.lua/hertzbeat/1.8.0/apache-hertzbeat-1.8.0-bin.tar.gz) (Server) ( [signature](https://downloads.apache.org/hertzbeat/1.8.0/apache-hertzbeat-1.8.0-bin.tar.gz.asc) , [sha512](https://downloads.apache.org/hertzbeat/1.8.0/apache-hertzbeat-1.8.0-bin.tar.gz.sha512) ) <br/> [apache-hertzbeat-collector-1.8.0-bin.tar.gz](https://www.apache.org/dyn/closer.lua/hertzbeat/1.8.0/apache-hertzbeat-collector-1.8.0-bin.tar.gz) (Collector) ( [signature](https://downloads.apache.org/hertzbeat/1.8.0/apache-hertzbeat-collector-1.8.0-bin.tar.gz.asc) , [sha512](https://downloads.apache.org/hertzbeat/1.8.0/apache-hertzbeat-collector-1.8.0-bin.tar.gz.sha512) ) <br/> [apache-hertzbeat-1.8.0-src.tar.gz](https://www.apache.org/dyn/closer.lua/hertzbeat/1.8.0/apache-hertzbeat-1.8.0-src.tar.gz) (Source Code) ( [signature](https://downloads.apache.org/hertzbeat/1.8.0/apache-hertzbeat-1.8.0-src.tar.gz.asc) , [sha512](https://downloads.apache.org/hertzbeat/1.8.0/apache-hertzbeat-1.8.0-src.tar.gz.sha512) )  <br/> [apache-hertzbeat-1.8.0-docker-compose.tar.gz](https://github.com/apache/hertzbeat/releases/download/1.8.0/apache-hertzbeat-1.8.0-docker-compose.tar.gz) (Docker Compose) ( [signature](https://downloads.apache.org/hertzbeat/1.8.0/apache-hertzbeat-1.8.0-docker-compose.tar.gz.asc) , [sha512](https://downloads.apache.org/hertzbeat/1.8.0/apache-hertzbeat-1.8.0-docker-compose.tar.gz.sha512) ) | [note](https://github.com/apache/hertzbeat/releases/tag/1.8.0) |

## Release Docker Image

> Apache HertzBeat™ provides a docker image for each release. You can pull the image from the [Docker Hub](https://hub.docker.com/r/apache/hertzbeat).

- HertzBeat [https://hub.docker.com/r/apache/hertzbeat](https://hub.docker.com/r/apache/hertzbeat)
- HertzBeat Collector [https://hub.docker.com/r/apache/hertzbeat-collector](https://hub.docker.com/r/apache/hertzbeat-collector)

## All Archived Releases

For older releases, please check the [archive](https://archive.apache.org/dist/incubator/hertzbeat/).

## Download FAQ

### Which package should I download?

**Server Binary** - For most users. Includes the main HertzBeat monitoring server with web UI.

**Collector Binary** - For distributed deployments. Deploy collectors in remote networks to report to the main server.

**Source Code** - For developers who want to build, modify, or contribute to HertzBeat.

**Docker Compose** - For quick all-in-one deployment with database and time-series storage.

### How do I verify the download?

1. Download the GPG signature (.asc) and checksum (.sha512) files
2. Verify signature: `gpg --verify apache-hertzbeat-*.tar.gz.asc apache-hertzbeat-*.tar.gz`
3. Verify checksum: `sha512sum -c apache-hertzbeat-*.tar.gz.sha512`

Import Apache HertzBeat KEYS first: `wget https://downloads.apache.org/hertzbeat/KEYS && gpg --import KEYS`

### What are the system requirements?

**Server Binary Requirements:**
- Java 17 or higher
- 4GB RAM minimum (8GB recommended)
- 2 CPU cores minimum
- 20GB disk space

**Collector Binary Requirements:**
- Java 17 or higher
- 2GB RAM minimum
- 1 CPU core minimum
- 5GB disk space

### Can I use Docker instead of binary packages?

Yes. Docker is the recommended installation method:
```bash
docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat
```

### How do I extract and run the binary?

```bash
tar -xzf apache-hertzbeat-1.8.0-bin.tar.gz
cd apache-hertzbeat-1.8.0
./bin/startup.sh
```

Access web UI at http://localhost:1157 with credentials admin/hertzbeat

### What's the difference between releases?

Each release includes bug fixes, security patches, and new features. The release notes link in the download table details specific changes.

**Always use the latest release** for security and stability.

### Where can I find old versions?

Previous versions are archived at https://archive.apache.org/dist/incubator/hertzbeat/

### How often are new versions released?

HertzBeat follows a regular release schedule with new versions approximately every 2-3 months. Security patches may be released more frequently.
