---
id: download
title: Download Apache HertzBeat 1.9.1
sidebar_label: Download
---

Release mirrors may still be syncing. Read the [1.9.1 upgrade guide](/docs/start/1.9.1-update) first and use matching manager and collector versions.

| Artifact | Download and verification |
| --- | --- |
| Source | [apache-hertzbeat-1.9.1-src.tar.gz](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-1.9.1-src.tar.gz) · [ASC](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-1.9.1-src.tar.gz.asc) · [SHA-512](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-1.9.1-src.tar.gz.sha512) |
| Server | [apache-hertzbeat-1.9.1-bin.tar.gz](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-1.9.1-bin.tar.gz) · [ASC](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-1.9.1-bin.tar.gz.asc) · [SHA-512](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-1.9.1-bin.tar.gz.sha512) |
| Docker server | [apache-hertzbeat-1.9.1-docker-bin.tar.gz](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-1.9.1-docker-bin.tar.gz) · [ASC](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-1.9.1-docker-bin.tar.gz.asc) · [SHA-512](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-1.9.1-docker-bin.tar.gz.sha512) |
| Docker Compose | [apache-hertzbeat-1.9.1-docker-compose.tar.gz](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-1.9.1-docker-compose.tar.gz) · [ASC](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-1.9.1-docker-compose.tar.gz.asc) · [SHA-512](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-1.9.1-docker-compose.tar.gz.sha512) |
| JVM collector | [apache-hertzbeat-collector-1.9.1-bin.tar.gz](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-collector-1.9.1-bin.tar.gz) · [ASC](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-collector-1.9.1-bin.tar.gz.asc) · [SHA-512](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-collector-1.9.1-bin.tar.gz.sha512) |
| Native collector Linux AMD64 | [apache-hertzbeat-collector-native-1.9.1-linux-amd64-bin.tar.gz](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-collector-native-1.9.1-linux-amd64-bin.tar.gz) · [ASC](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-collector-native-1.9.1-linux-amd64-bin.tar.gz.asc) · [SHA-512](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-collector-native-1.9.1-linux-amd64-bin.tar.gz.sha512) |
| Native collector Linux ARM64 | [apache-hertzbeat-collector-native-1.9.1-linux-arm64-bin.tar.gz](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-collector-native-1.9.1-linux-arm64-bin.tar.gz) · [ASC](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-collector-native-1.9.1-linux-arm64-bin.tar.gz.asc) · [SHA-512](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-collector-native-1.9.1-linux-arm64-bin.tar.gz.sha512) |
| Native collector Windows AMD64 | [apache-hertzbeat-collector-native-1.9.1-windows-amd64-bin.zip](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-collector-native-1.9.1-windows-amd64-bin.zip) · [ASC](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-collector-native-1.9.1-windows-amd64-bin.zip.asc) · [SHA-512](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-collector-native-1.9.1-windows-amd64-bin.zip.sha512) |

Verify signatures with [KEYS](https://downloads.apache.org/hertzbeat/KEYS) and check the SHA-512 digests. Previous releases are in the [Apache archive](https://archive.apache.org/dist/hertzbeat/).

## Choosing and verifying a package

The server package includes the manager and web interface. Use the JVM collector for a distributed deployment, or choose a native collector for its matching platform. Native collectors do not load external JDBC drivers at runtime; see the [native collector guide](/docs/start/native-collector). The Docker Compose archive provides deployment configuration.

Download the matching `.asc` and `.sha512` files along with the archive, then verify the signature and checksum. For example, for the source archive:

```bash
curl -O https://downloads.apache.org/hertzbeat/KEYS
gpg --import KEYS
gpg --verify apache-hertzbeat-1.9.1-src.tar.gz.asc apache-hertzbeat-1.9.1-src.tar.gz
sha512sum -c apache-hertzbeat-1.9.1-src.tar.gz.sha512
```
