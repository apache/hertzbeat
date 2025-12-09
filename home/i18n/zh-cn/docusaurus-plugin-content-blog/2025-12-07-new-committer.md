---
title: 热烈欢迎 HertzBeat 小伙伴新晋社区 Committer!
author: Delei
author_title: ZiQiu Guo
author_url: https://github.com/delei
tags: [opensource, practice]
keywords:
  [
    open source monitoring system,
    alerting system,
    Apache,
    Apache Committer,
    HertzBeat,
  ]
---

> 大家好，非常荣幸收到社区邀请，成为 Apache HertzBeat™ Committer。

## 个人介绍

自从事工作以来，我一直主要从事后端研发工作，对开源项目有非常大的兴趣。目前主要在一家金融软件公司就职并兼职运维管理工作。

## 初识 Apache HertzBeat

在实际工作中，我们之前一直在使用 Prometheus + Grafana 这一套监控系统。随着所需监控的设备和服务越来越多，由于运维人员有限，对于日常配置和维护工作量的急剧增加，使得我们无法及时处理和响应用户的反馈。此时我们一直想寻找一款轻量级开源监控系统，Apache HertzBeat 开箱即用、功能全面，无需 Agent，兼容 Prometheus，且全面覆盖目前我们使用的各类协议。于是我们内部基于 Docker 快速搭建并投入使用。

我本身就是一名开源爱好者，在实际使用了一段时间后发现了一些小的问题，由于刚好是我擅长的开发语言，于是便开始深入源码，尝试完善代码并贡献给社区。

## 开源贡献之路

我最初开始使用的是标签功能，结果一开始就发现标签维护有 NPE 问题。于是便研究了下源码，初步了解了问题原因。于是我通过官网的指引，提交了 [issue#3605](https://github.com/apache/hertzbeat/issues/3605),并提交了第一个 PR 来修复。虽然是一个很小的改动，但很快就被合并了，这给予了我极大的鼓励。

在接下来更加深入的使用过程中，根据实际监控的设备和场景，我主要增加了一些新的监控服务，比如 [Apache DolphinScheduler](https://github.com/apache/hertzbeat/pull/3656)、[MacOS](https://github.com/apache/hertzbeat/pull/3715)、[Synology NAS](https://github.com/apache/hertzbeat/pull/3721) 等，并和其他社区贡献者一起完善和修复了 `jexl` 关键字问题，也对状态页功能做了进一步的增强等。

## 社区参与和成长

通过参与 Apache HertzBeat 的日常贡献，也学习到如何更高效地在开源项目中协作。与社区成员的沟通与协作，让我更加深刻地体会到 "Apache Way" 的独特魅力和开源精神。

成为 Committer 意味着肩负更多责任。除了继续参与贡献外，更重要的是保持严谨的态度，给予贡献者建设性的反馈与认可，帮助更多人参与社区并在社区中收获成长。

## 给开源开发者的建议

对于初次参与开源的开发者来说，首先请勇于尝试，放下包袱走出第一步。贡献的过程，需要时间，但只要有耐心，就会有成果。

在 Apache HertzBeat 社区中，多沟通交流，社区中很多热情和友善的开源贡献者可以一起开源协作。我们可以先逐步使用和体验功能，并开始尝试贡献。例如文档错别字，错误注释等小的贡献，然后逐步深入理解源码，并尝试修复问题。

## 结语

衷心感谢各位社区伙伴的耐心 Review 和悉心指导。非常有幸在这段时间内，见证了 Apache HertzBeat 成功毕业成为 TLP 项目。

成为 Committer 只是我一个小的里程碑，期望和 Apache HertzBeat 一起继续秉持开源精神，吸引更多优秀的开发者，共同打造一个技术领先且充满活力的社区。
