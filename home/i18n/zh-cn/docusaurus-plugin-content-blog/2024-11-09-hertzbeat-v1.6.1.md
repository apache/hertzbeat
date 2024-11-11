---
title:  Apache Hertzbeat 1.6.1 发布公告
author: zhangshenghang
author_title: zhangshenghang
author_url: https://github.com/zhangshenghang
author_image_url: https://avatars.githubusercontent.com/u/29418975?s=400&v=4
tags: [opensource, practice]
keywords: [open source monitoring system, alerting system]
---

亲爱的社区小伙伴们，

我们很高兴地宣布，Apache Hertzbeat 1.6.1 版本正式发布！此次发布合并了468个PR，带来了众多新功能和改进。本文将详细介绍1.6.1版本的关键更新，欢迎更多开发者和用户加入我们的开源社区！

## 下载与文档

- **Apache Hertzbeat 1.6.1 下载地址**：<https://hertzbeat.apache.org/zh-cn/docs/download>
- **Apache Hertzbeat 文档地址**：<https://hertzbeat.apache.org/zh-cn/docs/>

## 主要更新

### 新功能与增强

- **新增监控功能**：支持Apache HBase、InfluxDB、VictoriaMetrics集群、HDFS、Yarn、Linux进程、HBase RegionServer、OpenAI账号、Redfish协议等监控。
- **Prometheus支持**：新增Prometheus解析器和Prometheus-like推送模式。
- **国际化支持**：为ClickHouse、DynamicTp、Airflow、IoTDB、RocketMQ等监控指标名称提供国际化支持。
- **自定义监控菜单**：监控模板现在支持自定义主菜单。
- **NebulaGraph支持**：新增对`ngql`查询NebulaGraph监控数据的支持。
- **短信功能**：支持通过阿里云发送短信。
- **Docker支持**：提供通过Docker Compose运行Hertzbeat的支持。

### Bug 修复

- **启动问题**：修复了Collector无法单独启动和MySQL依赖问题，以及MongoDB监控在Spring Boot 3中不可用的问题。
- **数据问题**：修复了JPA数据保存逻辑错误、Redis集群节点测试错误、旧数据解码错误等问题。
- **空指针异常修复**：修复了多个与空指针异常（NPE）相关的问题。
- **其它Bug修复**：包括命令窗口数据丢失、MongoDB模板命令错误等问题。

### 代码重构与优化

- **代码简化**：优化代码结构，使用Assert类简化null判断，移除不必要的if-else语句，采用Java 17的新语法。
- **依赖管理优化**：删除不必要的依赖，并将一些包重构为独立模块。
- **性能提升**：通过优化WebSocket连接、Redis URI构建等方面提升性能。
- **日志与配置更新**：更新Collector和Manager的logback配置。

### 文档翻译与改进

- **翻译工作**：将多个类描述、博客文章和监控模板文档从中文翻译为英文。
- **帮助文档增加**：为ClickHouse、DNS、Flink等监控项目增加了帮助文档。
- **文档结构更新**：更新官网文档、贡献指南、首页介绍等。

### 安全更新

- **依赖升级**：升级H2数据库依赖库，修复相关安全漏洞。
- **其他安全改进**：修复SSL证书剩余天数和Jexlespression的安全匹配问题。

### 测试用例添加

- **测试覆盖率提升**：新增Redis、Nginx、Telnet等监控功能的测试用例，提升测试覆盖率。

## 致谢

感谢 **@zqr10159** 对本次发版工作的支持，同时感谢以下社区成员的共同努力，使得本次发布顺利完成：

> LinuxSuRen, transactional, JavaProgrammerLB, westboy, xuziyang, makechoicenow, crossoverJie, xfl12345, boatrainlsz, lw-yang, tomsun28, Alanxtl, Aias00, Clownsw, zhangshenghang, zqr10159, LiuTianyou, handy-git, hudongdong129, dukbong, 15613060203, yqxxgh, miki-hmt, PeixyJ, allcontributors, Ceilzcx, lwjxy, starmilkxin, leo-934, zuobiao-zhou, tomorrowshipyltm, LLP2333, lwqzz, wang1027-wqh, gjjjj0101, ZY945, yuluo-yx, HeartLinked, alpha951, Hi-Mr-Wind, TJxiaobao, YxYL6125, MananPoojara, a-little-fool, Pzz-2021, Yanshuming1, Thespica, Calvin979, WinterKi1ler
>

## Apache Hertzbeat

**仓库地址：**

<https://github.com/apache/hertzbeat>

**网址：**

<https://hertzbeat.apache.org/>

**Apache Hertzbeat 下载地址：**

<https://hertzbeat.apache.org/zh-cn/docs/download>

**Apache Hertzbeat Docker 镜像版本：**

> Apache HertzBeat 为每个版本制作了 Docker 镜像. 你可以从 Docker Hub 拉取使用.

- HertzBeat <https://hub.docker.com/r/apache/hertzbeat>
- HertzBeat Collector <https://hub.docker.com/r/apache/hertzbeat-collector>

**Apache Hertzbeat 开源社区如何参与？**

<https://hertzbeat.apache.org/zh-cn/docs/community/contribution>
