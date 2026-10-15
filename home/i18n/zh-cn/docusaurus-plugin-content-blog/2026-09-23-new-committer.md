---
title: 热烈欢迎 HertzBeat 小伙伴新晋社区 Committer!
author: orangeCatDeveloper
author_title: orangeCatDeveloper
author_url: https://github.com/orangeCatDeveloper
tags: [community]
description: orangeCatDeveloper 分享从积压多年的老 issue 入手，修复数据可靠性、安全与部署问题并新增基础设施监控，成长为 Committer 的经历。
keywords:
  [
    open source monitoring system,
    alerting system,
    AI observability,
    Apache,
    Apache Committer,
    HertzBeat,
  ]
cover_headline: Welcome orangeCatDeveloper
cover_kicker: New Committer
---

> 大家好，非常荣幸经 Apache HertzBeat PMC 投票，当选为 Apache HertzBeat™ Committer。

## 个人介绍

我是 [orangeCatDeveloper](https://github.com/orangeCatDeveloper)，一名专注于 AI 基础设施的软件工程师。我关心的是 AI 系统里不太被看见的那一半：给模型供数的数据管道，让 AI Agent 安全运行的执行环境，以及判断这一切是否运转正常的可观测性。

## 初识 Apache HertzBeat

第一次认真看 HertzBeat，是冲着它的 AI 能力去的。它内置了 AI 对话和 MCP Server，大模型可以直接查监控数据、创建监控、分析告警。HertzBeat 是 Apache 软件基金会的顶级项目。截至 2026 年 9 月，它在 GitHub 上有 7400 多个 Star、300 多位贡献者，官方 Docker 镜像被拉取了 22 万多次。我在采集器里修掉的每一个 bug，都会随着新版本进入世界各地用户的监控系统。

往下翻代码和 issue 之后，我的注意力反而落到了另一头。模型再聪明，读到的也只是采集器交上来的那些数字。数字错了，它会很认真地给出一个错误的结论。issue 列表里正好有不少这类问题，有的已经挂了两三年，我就从那里开始了。

## 开源贡献之路

截至 2026 年 9 月，我一共为 HertzBeat 合并了 [37 个 PR](https://github.com/search?q=is%3Apr+is%3Amerged+author%3AorangeCatDeveloper+repo%3Aapache%2Fhertzbeat+repo%3Aapache%2Fhertzbeat-helm-chart&type=pullrequests)，关掉了 28 个 issue，其中 19 个挂了一年以上，最早的一个提于 2023 年 1 月。采集器本质上就是一条数据管道：从一百多种系统里取数，交给告警、看板，现在还有大模型。我做的事，大多是让这条管道靠得住。

最典型的是一个 2023 年就有人报告的问题：HertzBeat 一重启，网站监控就集体报慢，可网站本身好好的。根因是所有采集任务在重启后挤在同一秒触发，互相抢资源。我复现之后，给每个任务的首次调度加了随机抖动，让它们不再同时触发。在同样的测试负载下，监控上报的 p50 响应时间从 2865ms 降到 617ms，p95 从 6801ms 降到 1497ms。这类问题不报错，只是让数据悄悄失真，而告警、看板和 AI 分析读的都是这些数据。类似的还有编辑监控后历史数据被拆成多份、边界数据被悄悄丢弃等问题。

安全是另一头。监控系统通常部署在内网深处，手里握着大量服务器和数据库的凭证，它自己不能成为最薄弱的一环。项目原先依赖的 Bouncy Castle 1.68 所在的版本线已经停更，带着 7 个已公开、且不会再被修复的 CVE，我把它迁移到了仍在维护、没有已知漏洞的 1.85。另外修了证书监控在关闭校验后仍然检查主机名的问题，并给邮件服务器加了证书校验开关，方便内网自签证书的场景。

还有一些是部署上的问题。有一次数据库迁移和启动时的自动建表撞在了一起，全新安装会卡在启动阶段，之后再也起不来。我让迁移脚本可以重复执行，并让已经卡住的实例能自动恢复。在 Helm Chart 仓库，我修好了 CI，并为 Kubernetes 部署加上了启动探针。我还新增了 etcd 监控，它是 Kubernetes 控制面的核心存储。

## 社区参与和成长

这段时间最大的收获，是学会了怎么写一个让 reviewer 省力的 PR：先说用户遇到了什么，再说原因，最后贴修复前后的真实输出。大家的时间都很宝贵，证据摆在那里，讨论就会快很多。

成为 Committer 之后，我想多花些时间在 review 上，帮新来的朋友把第一个 PR 顺利合进去。自己这边，接下来想做三件事：继续清理积压的老 issue；定期排查已经停更或带有已知漏洞的依赖，把供应链风险挡在发版之前；继续补齐基础设施层的监控覆盖，让 AI 分析拿到的数据覆盖得更全、也更可靠。

## 给开源开发者的建议

如果不知道从哪里开始，可以把 issue 列表按创建时间从旧到新翻一翻。老 issue 都是用户真实遇到过的问题，很多已经讨论到有方向了。先复现，有些会发现早就修好了，剩下的就值得花力气。修完把前后对比贴出来，这比任何解释都管用。

AI 工具可以用，但提交的每一行代码，你都得能讲清楚为什么这样写。

## 结语

感谢社区各位对每个 PR 的耐心 review，也感谢 PMC 的提名和投票。HertzBeat 正在往 AI 驱动的可观测平台走，我希望它交给 AI 的每一个数字都经得起推敲。接下来继续一起加油。
