---
title: 热烈欢迎 HertzBeat 小伙伴新晋社区 Committer!
author: LiuTianyou
author_title: LiuTianyou
author_url: https://github.com/LiuTianyou
author_image_url: https://avatars.githubusercontent.com/u/30208283?v=4
tags: [opensource, practice]
keywords: [open source monitoring system, alerting system]
---

![hertzBeat](/img/blog/new-committer.png)

大家好，非常荣幸可以收到社区邀请被提名为 Apache HertzBeat 的 Committer。我先做一个简单的自我介绍，从2019年工作开始，一直从事后端开发工作，主要使用Java语言，目前在一家网络安全公司从事网络安全相关产品后端开发工作。

### 遇见

我工作的项目里部署着数台物理服务器，其中运行着各种数据库，中间件，尽管部署了 Prometheus + grafana 的监控组合，但由于大多数的服务和服务器都需要额外安装 exporter，这套监控系统并没有覆盖到项目的全部，有时候服务宕机了，被用到了才发现。四月份的某一天我刷到了一篇公众号文章介绍了 HertzBeat，我马上被不需要 agent，全程可视化配置的特新吸引加上支持docker一键部署，我迅速的部署起来了 HertzBeat 并投入了使用。

### 熟悉

由于完全可视化操作，很快就将项目中用到的服务器，数据库，中间件纳入了 HertzBeat 的管理。之后，恰好社区为发布第一个Apache版本做准备，需要补充大量的文档。我尝试提交一些文档，来熟悉社区的提交代码和文档的流程，也顺便在补充的文档的过程的熟悉相关部分的代码。

### 尝试加一点东西

我做的第一个大的改动是让 HertzBeat 支持使用NGQL语句从NebulaGraph中查询指标，并且这个基于协议增加了NebulaGraph集群的监控模板。最开始有这个想法来源于自己的需求，当我把这个想法提交给社区时，很快就得到了社区的回应，并得到了肯定，这也让对持续参与这个项目信心倍增。

### 加入

由于我不停的写文档，贡献代码，我开始熟悉这个社区，熟悉这个项目，开始尝试提出一些自己的建议。很多建议都被社区采纳，并且在新版本中发布，在第一个Apache版本发布后，我收到了@tomsun28和@TJxiaobao的邀请被提名为Committer。

### 结语

非常荣幸可以参与到这个项目中并被社区认可，感谢帮我review代码，给我指导和帮助的 @tomsun28，@TJxiaobao，@zqr10159，@tuohai666，@yuluo-yx，@crossoverJie，@zhangshenghang，@pwallk。最后祝 Apache HertzBeat 茁壮成长，有越来越多的贡献者参与其中。
