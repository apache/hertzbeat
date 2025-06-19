---
title: 成为 Apache Committer, 对我参与开源的肯定
author: yuluo-yx
author_title: Shown Ji
author_url: https://github.com/yuluo-yx
author_image_url: https://avatars.githubusercontent.com/u/77964041
tags: [opensource, practice]
keywords: [open source monitoring system, alerting system, Apache, Apache Committer, Hertzbeat]
---

## 我的开源历程

说起开源，我在大三刚开始的时候就接触到了。当时的场景仍然历历在目。

回想起来，我第一个正式的 Github Pull Request 是给 Spring Cloud Alibaba 项目删除了一个多余的 Pom 依赖项。当时手忙脚乱，在捉摸了两个多小时后，才算是成功提交了第一个 Pull Request。非常感谢[铖朴](https://github.com/steverao)，是他带着我认识了开源，踏出了参与开源至关重要的第一步。

从刚开始使用 Git 的手忙脚乱，到现在 `git c -m XXX`，以及 Github 上参与的各个 PR/Issue。回想起来，真是思绪万千。我觉得人生莫过于如此。学习摸索 -> 熟练使用 -> 做出成绩。

从大三至今，我仍然保持着对开源的热情，参与开源，直至今日，我已经是三个项目的 Committer 了。

## 参与 Apache Community

[Apache 软件基金会（Apache Software Foundation，简称为ASF）](https://community.apache.org/)，是一家美国的非营利组织，旨在支持各类开源软件项目。ASF最初由 Apache HTTP Server 的一群开发者组成，并在1999年3月25日正式成立。 截至2021年，其总成员数大约在1000名。命名是根据北美当地的一支印第安部落而来，这支部落以高超的军事素养和超人的忍耐力著称，19世纪后半期对侵占他们领土的入侵者进行了反抗。为了对这支印第安部落表示敬仰之意，取该部落名称（Apache）作为服务器名。但一提到这个命名，这里还有流传着一段有意思的故事。因为这个服务器是在 NCSA HTTPd 服务器的基础之上，通过众人努力，不断地修正、打补丁（Patchy）的产物，被戏称为“A Patchy Server”（一个补丁服务器）。在这里，因为“A Patchy”与“Apache”是谐音，故最后正式命名为“Apache Server”。

以上是来自于维基百科中对 Apache 软件基金会的介绍。

Apache 软件基金会起初是由开发 [Apache HTTPd](https://httpd.apache.org/) 的开发人员组成，他们以 Apache HTTPd 这一网络服务器项目为起点，创建了许多优秀的开源项目，吸引全球共同的开源爱好者参与项目的维护与迭代。不断有项目退休，不断有新项目被孵化，反反复复。才有了今天的 Apache 软件基金会。

![Apache HTTPd Server Logo](/img/blog/committer/yuluo-yx/4.jpg)

### 第一次贡献

在 Apache 社区中的第一次贡献应该是给 Dubbo 项目删除了一个 `{@link}` 代码链接。说来惭愧，[Dubbo](https://github.com/apache/dubbo) 是我参与 Apache 的第一个开源项目，到现在为止仅有 6 个提交。5 月份的时候通过 [Rick](https://github.com/LinuxSuRen) 接触到了 [Apache Hertzbeat](https://github.com/apache/hertzbeat) 项目，从单元测试开始了我的 Apache 贡献之路。

### 获得提名，成为 Committer

此次提名是 Apache HertzbeatP(Incubating) 的 PPMC Member [Logic](https://github.com/zqr10159) 举荐的，感谢 Apache Hertzbeat Team。顺利提名成为了 Hertzbeat Committer，有了自己的 Apache 邮箱。

![Apache ID Email](/img/blog/committer/yuluo-yx/3.jpg)

### Apache Committer 的意义

俗话说，能力越大，任务越大。成为了项目的 Committer 不仅仅是一个身份的转换，更是一个对自己自身能力的认同和肯定。在 Review PR 时，我的 `LGTM` 不再是一个灰色样式，而是变成了蓝色（因个人 Github 主题不同，展现的颜色也不同）。不用在等待其他的 Committer Approve CI。意味着对项目有了管理权利。

![PR Approve](/img/blog/committer/yuluo-yx/5.jpg)

## 参与开源的方法

任何人去做一件事情，都需要一个契机和引路人。在许许多多的 Apache 项目中，不乏关注项目 Issue List 的人。记忆犹新的一次是：某个晚上在写完工具类的单元测试，发现了一个小 Bug。当时心里想的是，这个上下文信息太多了，写在 PR 里面不太好，于是开了一个 Issue 记录上下文。这个 Bug 小到什么程度呢？小到我刚创建完 Issue，在将单元测试和修复 Bug 的代码一起提交之后，再次刷新 PR List，看到了一个修复 Bug 的 PR Title。

其实不缺乏关注项目的人，更多的是需要一个契机！参与项目的契机。

### The Apache Way

Apache Community 奉行的 [The Apache Way](https://www.apache.org/theapacheway/)。社区大于代码，好的社区往往比优秀的代码更重要，社区的组成成分包括开发者，用户等等。用户才是项目代码的第一使用者，健康的社区状态是用户在使用过程中：发现问题，而后报告问题，最后解决问题。更可能发生的一种情况是，用户报告问题，从用户身份转为开发者，解决问题。并在之后持续参与社区项目的维护。

### 参与开源的路径

开源往往很纯粹，Apache 基金会存在的意义也是为了保护项目和开发者。

#### Apache 社区身份定义

参与社区贡献之前，先要了解社区的身份定义是怎样的，项目的 Committer 到底位于哪一层级，怎么才能成为 Committer。Apache 社区对[贡献者身份](https://community.apache.org/contributor-ladder.html)有很明确的定义：

![Apache contributor label](/img/blog/committer/yuluo-yx/6.jpg)

#### 项目 Committer 提名条件

项目 PPMC Team 提名 Committer 的条件是不一样的。以 Apache Hertzbeat 为例：

![Apache Hertzbeat becoming committer](/img/blog/committer/yuluo-yx/7.jpg)

每个项目都有自己的标准，这些标准也不是一成不变，在项目的每个阶段会进行调整。

#### 如何参与开源

接下来是此章节的重头戏，如何参与开源并获得 Committer 提名？

##### 开源活动

学生因为身份特殊，没有大型项目的开发经验，也没有机会在生产环境中切身使用。因此参与开源往往很困难，缺少契机。

我觉得参与开源并获得提名的最好方式是**开源之夏（OSPP）或者谷歌开源之夏（GSOC）活动**。在完成相关课题之后，逐步熟悉项目功能、代码、持续参与就会获得提名。也不乏一些学生在完成题目之后被直接提名成为项目 Committer。

其次是**提高自己的 Coding 能力**，发现项目中缺少的单元测试和代码 Bug，然后提交 PR 修复。这对刚开始的同学往往是比较难得。Coding 能力往往是在优化项目代码，了解每一次 Change 之后慢慢积累的。

一个好的项目，**周边生态往往是至关重要的**。一份好的文档，可以让用户/开发者快速上手使用，参与贡献。多语言扩展，可以让项目使用在其他语言构建的项目中，扩大项目受众。一个好的 Example 仓库，可以让用户发现更多项目的使用姿势。因此参与 Example 仓库的建设和文档编写、翻译等工作，也是熟悉项目获得提名的方式之一。

最后，我要说的是：获得提名是`水到渠成`的事情，不能为了获得提名而去参与开源，任何时候都不要忘记自己的初心。

项目社区往往欢迎各种方式的贡献：不论是代码、文档还是布道。

## 随想

写下此文，是为了纪念成为 Apache Hertzbeat Committer 这个特殊的事情, 同时也是对我之后参与开源的激励。
保持热情，保持 Coding。感谢在参与开源的时候给与我帮助的各位。也祝 Hertzbeat 顺利孵化毕业，成为 Apache 顶级项目！🎉
