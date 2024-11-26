---
title: Announcement of Apache Hertzbeat 1.6.1 Release
author: zhangshenghang
author_title: zhangshenghang
author_url: https://github.com/zhangshenghang
author_image_url: https://avatars.githubusercontent.com/u/29418975?s=400&v=4
tags: [opensource, practice]
keywords: [open source monitoring system, alerting system]
---

Dear Community Members,

We are thrilled to announce the official release of Apache Hertzbeat version 1.6.1! This release incorporates 468 pull requests, introducing numerous new features and enhancements. In this post, we’ll delve into the key updates of version 1.6.1. We warmly welcome more developers and users to join our open-source community!

## Downloads and Documentation

- **Apache Hertzbeat 1.6.1 Download Link**: <https://hertzbeat.apache.org/zh-cn/docs/download>
- **Apache Hertzbeat Documentation**: <https://hertzbeat.apache.org/zh-cn/docs/>

## Major Updates

### New Features and Enhancements

- **Expanded Monitoring Capabilities**: Added support for monitoring Apache HBase, InfluxDB, VictoriaMetrics clusters, HDFS, Yarn, Linux processes, HBase RegionServer, OpenAI accounts, and Redfish protocol.
- **Prometheus Support**: Introduced Prometheus parser and Prometheus-like push mode.
- **Internationalization**: Added internationalization support for monitoring metrics of ClickHouse, DynamicTp, Airflow, IoTDB, RocketMQ, and others.
- **Custom Monitoring Menu**: Monitoring templates now support customizable main menus.
- **NebulaGraph Support**: Added support for querying monitoring data from NebulaGraph using `ngql`.
- **SMS Functionality**: Enabled SMS notifications through Alibaba Cloud.
- **Docker Support**: Added support for running Hertzbeat using Docker Compose.

### Bug Fixes

- **Startup Issues**: Resolved Collector standalone startup issues, MySQL dependency problems, and MongoDB monitoring compatibility with Spring Boot 3.
- **Data Issues**: Fixed errors in JPA data persistence logic, Redis cluster node testing, and old data decoding.
- **Null Pointer Exceptions**: Addressed multiple NPE-related issues.
- **Other Bug Fixes**: Fixed issues such as data loss in command windows and MongoDB template command errors.

### Refactoring and Optimization

- **Code Simplification**: Optimized code structure, used the Assert class to simplify null checks, removed unnecessary if-else statements, and adopted Java 17 syntax.
- **Dependency Management**: Removed redundant dependencies and refactored certain packages into standalone modules.
- **Performance Improvements**: Enhanced performance through WebSocket connection optimization and better Redis URI construction.
- **Logs and Configurations**: Updated logback configurations for Collector and Manager.

### Documentation Enhancements

- **Translation Work**: Translated multiple class descriptions, blog posts, and monitoring template documentation from Chinese to English.
- **New Help Documentation**: Added help documentation for monitoring projects like ClickHouse, DNS, and Flink.
- **Updated Documentation Structure**: Refined the official website documentation, contribution guidelines, and homepage descriptions.

### Security Updates

- **Dependency Upgrades**: Upgraded the H2 database library to address security vulnerabilities.
- **Other Security Enhancements**: Fixed SSL certificate remaining days calculation and security matching in JexExpression.

### Additional Test Cases

- **Improved Test Coverage**: Added test cases for Redis, Nginx, Telnet, and other monitoring features, enhancing overall test coverage.

## Acknowledgements

Special thanks to **@zqr10159** for supporting this release and to the following community members for their collaborative efforts, ensuring the smooth completion of this release:

> LinuxSuRen, transactional, JavaProgrammerLB, westboy, xuziyang, makechoicenow, crossoverJie, xfl12345, boatrainlsz, lw-yang, tomsun28, Alanxtl, Aias00, Clownsw, zhangshenghang, zqr10159, LiuTianyou, handy-git, hudongdong129, dukbong, 15613060203, yqxxgh, miki-hmt, PeixyJ, allcontributors, Ceilzcx, lwjxy, starmilkxin, leo-934, zuobiao-zhou, tomorrowshipyltm, LLP2333, lwqzz, wang1027-wqh, gjjjj0101, ZY945, yuluo-yx, HeartLinked, alpha951, Hi-Mr-Wind, TJxiaobao, YxYL6125, MananPoojara, a-little-fool, Pzz-2021, Yanshuming1, Thespica, Calvin979, WinterKi1ler
>

## Apache Hertzbeat

**Repository URL:**

<https://github.com/apache/hertzbeat>

**Official Website:**

<https://hertzbeat.apache.org/>

**Apache Hertzbeat Download Link:**

<https://hertzbeat.apache.org/zh-cn/docs/download>

**Apache Hertzbeat Docker Images:**

Apache Hertzbeat provides Docker images for each release, available on Docker Hub:

- HertzBeat: <https://hub.docker.com/r/apache/hertzbeat>
- HertzBeat Collector: <https://hub.docker.com/r/apache/hertzbeat-collector>

**How to Contribute to the Apache Hertzbeat Open Source Community?**

<https://hertzbeat.apache.org/zh-cn/docs/community/contribution>
