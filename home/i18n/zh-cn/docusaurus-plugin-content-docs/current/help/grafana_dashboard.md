---
id: grafana_dashboard  
title: Grafana Dashboard      
sidebar_label: Grafana历史图表   
keywords: [Grafana, 历史图表]
---

> `Grafana`是一个开源的可视化和分析平台，它可以帮助你轻松地创建、分享和监控仪表板。本文将介绍如何在`HertzBeat`中使用`Grafana`展示历史数据。

### 前提条件

- 我们推荐使用最新的`Grafana`版本，早期的版本可能不支持暴露 api。
- `Grafana`服务已经启动，并配置好了账号密码。
- `HertzBeat`服务已经启动，并配置好了`VictoriaMetrics`时序数据库(注意: `VictoriaMetrics`数据源是必须的)。

:::caution 注意
`Grafana`只能展示`Prometheus`类型监控的历史数据,目前并不支持`HertzBeat`中`yml`定义的监控数据。
:::

### 启用Grafana可嵌入功能, 并配置匿名访问及权限角色

参考: <https://grafana.com/blog/2023/10/10/how-to-embed-grafana-dashboards-into-web-applications/>,
修改配置文件`grafana.ini`中的配置项参数,
或者通过`docker`运行`Grafana`。

修改配置文件`grafana.ini`中的以下配置项参数:

```ini
[auth.proxy]
enabled = true

[auth.anonymous]
enabled = true
org_role = Admin

[users]
viewers_can_edit = true

[security]
allow_embedding = true
```

或者通过`docker`启动`Grafana`，使用以下命令:

```bash
docker run -d -p 3000:3000 --name=grafana \
  -v "$PWD/data:/var/lib/grafana" \
  -e "GF_AUTH_PROXY_ENABLED=true" \
  -e "GF_AUTH_ANONYMOUS_ENABLED=true" \
  -e "GF_AUTH_ANONYMOUS_ORG_ROLE=Admin" \
  -e "GF_USERS_VIEWERS_CAN_EDIT=true" \
  -e "GF_SECURITY_ALLOW_EMBEDDING=true" \
  grafana/grafana:latest
```

### 在HertzBeat中配置Grafana

在`HertzBeat`的配置文件`application.yml`中，配置`Grafana`数据源:

```yaml
grafana:
  enabled: true
  url: http://127.0.0.1:3000
  username: admin
  password: admin
```

### 在HertzBeat监控中上传Grafana监控模板json文件

在`HertzBeat`新建或编辑`Prometheus`类型监控时,点击启用Grafana模板,选择Grafana模板json文件上传。
监控模板json文件可以在 <https://grafana.com/grafana/dashboards/> 下载。
比如,在`HertzBeat`中新建一个关于`VictoriaMetrics`单节点的监控,然后打开 <https://grafana.com/grafana/dashboards/10229-victoriametrics-single-node/> ,点击右侧 `Download JSON`按钮,下载模板json文件。在`HertzBeat`监控中上传模板json文件,保存。
    ![grafana-1.png](/img/docs/help/grafana-1.png)

### 查看Grafana历史图表

在`HertzBeat`监控页面,点击`Grafana`按钮,选择`Grafana`历史图表,选择监控模板,点击`查询`按钮,即可查看`Grafana`历史图表。
    ![grafana-2.png](/img/docs/help/grafana-2.png)
