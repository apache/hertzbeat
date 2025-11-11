---
title: 热烈欢迎 HertzBeat 小伙伴新晋社区 Committer!
author: Duansg
author_title: SiGuo Duan
author_url: https://github.com/Duansg
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

- **姓名**: 段嗣国
- **Github**: [Duansg](https://github.com/Duansg)
- **邮箱**: [duansg@apache.org](mailto:duansg@apache.org)
- **职位**: 资深开发工程师
- **主要技术方向**: 目前从事于电商行业，主要聚焦在亿级商品中台业务的数据处理及管理的研发领域。

## 初识 Apache HertzBeat

在实际项目中，为了改善现有的监控体系，我们希望对已有指标进行可视化监控与告警。但同时，又不希望引入或兼容过于复杂的监控系统。因此，我开始寻找一款开箱即用、功能全面且易于扩展的监控解决方案，也正是在这个过程中，我逐渐接触并了解了 Apache HertzBeat。

随着不断的调研与调试，我开始深入其源码，并逐步参与到社区的贡献中。如今，关注社区动态、阅读 PR 和讨论问题，已经成为我日常的一部分。

## 开源贡献之路

在正式参与 Apache HertzBeat 项目的贡献过程中，起初最大的挑战是对项目架构的不熟悉，尤其是各模块之间的协作机制。 我通过阅读官方文档、源码以及社区的历史 PR，逐渐梳理清了脉络。与此同时，在 PR Review 的过程中，与社区成员的讨论也让我获得了许多宝贵的建议与新的思路——这些交流带来了巨大的成长。

通过系统地阅读源码与分析历史改动，我逐步深入理解了项目结构，并积极参与代码修复与功能完善。目前，我已在 Apache HertzBeat 项目中提交并合并了多项贡献，包括但不限于：

> [47 commits](https://github.com/apache/hertzbeat/commits?author=Duansg)  23,649 ++  5,547 --

**Submitted PR (47 commits)**

- 修复:

  Prometheus 实时阈值未生效的问题([#3434](https://github.com/apache/hertzbeat/pull/3434))、自定义看板的空指针异常([#3448](https://github.com/apache/hertzbeat/pull/3448))、Jacoco 无法生成测试报告的问题([#3455](https://github.com/apache/hertzbeat/pull/3455))、
  页面数量计算错误([#3467](https://github.com/apache/hertzbeat/pull/3467))、ANTLR4 语义解析修复与优化([#3482](https://github.com/apache/hertzbeat/pull/3482)、[#3488](https://github.com/apache/hertzbeat/pull/3488))、收集器启动通知异常([#3579](https://github.com/apache/hertzbeat/pull/3579))、
  收集器离线时未发送通知([#3601](https://github.com/apache/hertzbeat/pull/3601))、JEXL 关键字问题修复与补充([#3629](https://github.com/apache/hertzbeat/pull/3629))、JDBC URL 的安全相关处理问题([#3625](https://github.com/apache/hertzbeat/pull/3625))、
  监控模板修复([#3636](https://github.com/apache/hertzbeat/pull/3636)、[#3649](https://github.com/apache/hertzbeat/pull/3649))、Server酱白名单优化([#3740](https://github.com/apache/hertzbeat/pull/3740))、Grafana 可视化集成显示问题([#3666](https://github.com/apache/hertzbeat/pull/3666))

- 改进:

  Prometheus解析([#3761](https://github.com/apache/hertzbeat/pull/3761)、[#3752](https://github.com/apache/hertzbeat/pull/3752)、[#3745](https://github.com/apache/hertzbeat/pull/3745)、[#3725](https://github.com/apache/hertzbeat/pull/3725)、[#3662](https://github.com/apache/hertzbeat/pull/3662))、指标渲染性能改进[#3719](https://github.com/apache/hertzbeat/pull/3719)、样式改进([#3734](https://github.com/apache/hertzbeat/pull/3734))、SSE异常处理改进([#3775](https://github.com/apache/hertzbeat/pull/3775))、阈值规则操作改进([#3780](https://github.com/apache/hertzbeat/pull/3780))

- 重构:

  告警缓存管理([#3525](https://github.com/apache/hertzbeat/pull/3525))、PromQL阈值比较逻辑([#3574](https://github.com/apache/hertzbeat/pull/3574))、Prometheus 标签值 UTF-8支持([#3810](https://github.com/apache/hertzbeat/pull/3810))

- 新功能:

  PromQL阈值配置预览([#3505](https://github.com/apache/hertzbeat/pull/3505))、系统时区功能([#3588](https://github.com/apache/hertzbeat/pull/3588))、指标收藏功能([#3735](https://github.com/apache/hertzbeat/pull/3735))
  jenkins监控([#3774](https://github.com/apache/hertzbeat/pull/3774))、apollo配置中心监控([#3768](https://github.com/apache/hertzbeat/pull/3768))、TDengine监控([#3678](https://github.com/apache/hertzbeat/pull/3678))
  华为云告警集成([#3443](https://github.com/apache/hertzbeat/pull/3443))、阿里云SLS告警集成([#3422](https://github.com/apache/hertzbeat/pull/3422))、指标解析([#3645](https://github.com/apache/hertzbeat/pull/3645)、[#3612](https://github.com/apache/hertzbeat/pull/3612))
  国际化相关([#3585](https://github.com/apache/hertzbeat/pull/3585)[#3565](https://github.com/apache/hertzbeat/pull/3565))

- 文档:

  文档相关([#3383](https://github.com/apache/hertzbeat/pull/3383)、[#3380](https://github.com/apache/hertzbeat/pull/3380)、[#3526](https://github.com/apache/hertzbeat/pull/3526)、[#3559](https://github.com/apache/hertzbeat/pull/3559)、[#3600](https://github.com/apache/hertzbeat/pull/3600)、[#3658](https://github.com/apache/hertzbeat/pull/3658)、[#3695](https://github.com/apache/hertzbeat/pull/3695))

## 社区参与和成长

通过参与 Apache HertzBeat 的例会与日常贡献，不仅拓宽了个人的技术视野，也学习到如何更高效地在开源项目中协作。与社区成员的沟通与协作，让我更加深刻地体会到开源社区的开放、包容与互助精神。

成为 Committer 意味着肩负更多责任。除了继续完善代码之外，更重要的是在 Review 时保持严谨的态度，给予贡献者建设性的反馈与认可，帮助更多人参与并成长。

## 给开源开发者的建议

开源之路始于兴趣，成长于实践。开源不仅是技术热情的载体，更是一段与社区共同成长的旅程。

对于初次参与开源的开发者来说，勇于尝试是最重要的一步。即使是最小的贡献，也能积累宝贵的经验。
在日常中，多参与社区讨论与代码评审，在交流中不断学习；保持耐心与坚持，每一次遇到的难题与挑战，都是成长的契机。

在 Apache HertzBeat 社区中，实际参与项目的机会很多。多关注 Issue 列表，多沟通交流——总会有人积极回应你的想法，并从你的观点中获得启发，这正是社区的“双向奔赴”。

## 为 Apache HertzBeat 贡献力量

种一棵树最好的时间是十年前，其次是现在。 如果你也想为 Apache HertzBeat 贡献力量，可以从以下几个方向开始：

1. 文档与翻译：改进或翻译项目文档，既能快速熟悉项目，也能帮助更多用户了解项目。
2. 问题修复：浏览项目的 issue，尝试认领并修复一些简单的问题或优化点。
3. 功能扩展：根据兴趣与项目需求，参与新功能的讨论与开发，逐步深入理解项目架构并完善功能。

## 结语

期望 Apache HertzBeat 能够继续秉持开源精神，吸引更多优秀的开发者，共同打造一个技术领先且充满活力的社区。我也将持续为 Apache HertzBeat 贡献一份力量，期待更多开发者加入我们，一起推动项目的发展。

非常感谢社区的伙伴们，感谢你们对每一个 PR 的细致 Review 与耐心指导，希望项目未来影响力越来越大，社区越来越好！
