---
id: rainbond-deploy  
title: 使用 Rainbond 部署 HertzBeat    
sidebar_label: 基于Rainbond部署
---

如果你不熟悉 Kubernetes，想在 Kubernetes 中安装 Apache HertzBeat (incubating)，可以使用 Rainbond 来部署。Rainbond 是一个基于 Kubernetes 构建的云原生应用管理平台，可以很简单的将你的应用部署到 Kubernetes中。

## Rainbond Cloud 部署

如果想在 “Rainbond Cloud” 上一键部署 “HertzBeat”，可以按照以下步骤进行操作

- 打开 [HertzBeat 应用详情](https://hub.grapps.cn/marketplace/apps/753)

![HertzBeat应用详情](/img/docs/start/hertzbeat-desc.png)

- 登录 Rainbond Cloud 帐号，没有帐号，提前注册帐号！

![Rainbond Cloud](/img/docs/start/rainbond-cloud.png)

- 选择版本安装

![hertzbeat 版本](/img/docs/start/hertzbeat-versions.png)

## 开源 Rainbond 部署

### 前提

安装 Rainbond，请参阅 [Rainbond 快速安装](https://www.rainbond.com/docs/quick-start/quick-install)。

### 部署 HertzBeat

登录 Rainbond 后，点击左侧菜单中的 `应用市场`，切换到开源应用商店，在搜索框中搜索 `HertzBeat`，点击安装按钮。

![HertzBeat](/img/docs/start/install-to-rainbond.png)

填写以下信息，然后点击确认按钮进行安装。

- 团队：选择现有团队或创建新的团队
- 集群：选择对应的集群
- 应用：选择现有应用或创建新的应用
- 版本：选择要安装的 HertzBeat 版本

等待安装完成，即可访问 HertzBeat 应用。

![HertzBeat](/img/docs/start/hertzbeat-topology.png)

:::tip
通过 Rainbond 安装的 HertzBeat，默认使用了外部的 Mysql 数据库 和 Redis 以及 IoTDB。同时也挂载了 HertzBeat 的配置文件，可以在 `组件 -> 环境配置 -> 配置文件设置` 中修改配置文件。
:::
