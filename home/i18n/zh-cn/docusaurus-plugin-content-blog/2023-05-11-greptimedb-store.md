---
title: GreptimeDB & HertzBeat, 使用开源时序数据库 GreptimeDB 存储开源实时监控 HertzBeat 的度量数据    
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource, practice]
keywords: [开源监控系统, 开源时序数据库, HertzBeat, GreptimeDB]
---

## 使用开源时序数据库 GreptimeDB 存储开源实时监控 HertzBeat 的度量数据

### 什么是 GreptimeDB

> [GreptimeDB](https://github.com/GreptimeTeam/greptimedb) 是一款开源、分布式、云原生时序数据库，融合时序数据处理和分析。

- 完善的生态系统，支持大量开放协议，与 MySQL/PostreSQL/PromQL/OpenTSDB 等兼容，学习成本低，开箱即用。
- 时序、分析混合负载，支持高并发的读/写；原生支持 PromQL， 支持 SQL/Python 进行强大的库内分析。
- 高效存储与计算，通过对象存储和高数据压缩率实现超低的存储成本。内置数据分析解决方案，避免将数据复制到外部数据仓库。
- 分布式、高可靠与高可用，通过解耦的云原生架构，轻松独立地扩展每个模块。通过可配置的副本和自动的故障转移机制，确保数据的可靠性和可用性。

Cloud: **[GreptimePlay](https://greptime.com/playground)**

### 什么是 HertzBeat

> [HertzBeat](https://github.com/apache/hertzbeat) 一个拥有强大自定义监控能力，无需 Agent 的开源实时监控告警工具。

- 集 **监控+告警+通知** All in one，支持对应用服务，应用程序，数据库，缓存，操作系统，大数据，中间件，Web服务器，云原生，网络，自定义等监控，阈值告警通知一步到位。
- 更自由化的阈值规则(计算表达式)，`邮件` `Discord` `Slack` `Telegram` `钉钉` `微信` `飞书` `短信` `Webhook` 等方式及时送达。
- 将`Http, Jmx, Ssh, Snmp, Jdbc, Prometheus`等协议规范可配置化，只需在浏览器配置`YML`监控模板就能使用这些协议去自定义采集想要的指标。

> `HertzBeat`的强大自定义，多类型支持，易扩展，低耦合，希望能帮助开发者和中小团队快速搭建自有监控系统。

Cloud: **[TanCloud](https://console.tancloud.cn/)**

### GreptimeDB & HertzBeat

> 下面内容我们会通过一步一步的形式演示 HertzBeat 如何结合 GreptimeDB 作为存储端来存储收集到的指标数据。

#### 安装部署 GreptimeDB

具体可以参考 [官方文档](https://docs.greptime.com/getting-started/overview#docker)

1. Docker 安装 GreptimeDB

    ```shell
    $ docker run -p 4000-4004:4000-4004 \
        -p 4242:4242 -v "$(pwd)/greptimedb:/tmp/greptimedb" \
        --name greptime \
        greptime/greptimedb:0.2.0 standalone start \
        --http-addr 0.0.0.0:4000 \
        --rpc-addr 0.0.0.0:4001
    ```

   - `-v "$(pwd)/greptimedb:/tmp/greptimedb"` 为 greptimeDB 数据目录本地持久化挂载，建议将`$(pwd)/greptimedb`替换为您想指定存放的实际本地目录

2. 使用```$ docker ps | grep greptime```查看 GreptimeDB 是否启动成功

#### 安装部署 HertzBeat

具体可以参考 [官方文档](https://hertzbeat.apache.org/zh-cn/docs/start/docker-deploy)

1. Docker 安装 HertzBeat

    ```shell
    $ docker run -d -p 1157:1157 \
        -e LANG=zh_CN.UTF-8 \
        -e TZ=Asia/Shanghai \
        -v /opt/data:/opt/hertzbeat/data \
        -v /opt/application.yml:/opt/hertzbeat/config/application.yml \
        --restart=always \
        --name hertzbeat apache/hertzbeat
    ```

   - `-v /opt/data:/opt/hertzbeat/data` : (可选，数据持久化)重要⚠️ 挂载H2数据库文件到本地主机，保证数据不会因为容器的创建删除而丢失

   - `-v /opt/application.yml:/opt/hertzbeat/config/application.yml`  : 挂载自定义本地配置文件到容器中，即使用本地配置文件覆盖容器配置文件。

    注意⚠️ 本地挂载配置文件 `application.yml` 需提前存在，文件完整内容见项目仓库[/script/application.yml](https://github.com/apache/hertzbeat/raw/master/script/application.yml)

2. 浏览器访问 <http://ip:1157/> 默认账户密码 admin/hertzbeat，查看 HertzBeat 是否启动成功。

#### 配置使用 GreptimeDB 存储 HertzBeat 监控指标度量数据

1. 修改 HertzBeat 端配置文件

    修改挂载到本地的 HertzBeat 配置文件 [application.yml](https://github.com/apache/hertzbeat/raw/master/script/application.yml), 安装包模式下修改 `hertzbeat/config/application.yml`

    **修改里面的`warehouse.store.jpa.enabled`参数为`false`， 配置里面的`warehouse.store.greptime`数据源参数，URL账户密码，并启用`enabled`为`true`**

    ```yaml
    warehouse:
       store:
          # 关闭默认JPA
          jpa:
             enabled: false
          greptime:
             enabled: true
             endpoint: localhost:4001
    ```

2. 重启 HertzBeat

    ```shell
    docker restart hertzbeat
    ```

#### 观察验证效果

1. 浏览器访问 HertzBeat <http://ip:1157/> 默认账户密码 admin/hertzbeat
2. 使用 HertzBeat 添加应用监控，比如网站监控，Linux监控，Mysql监控
3. 监控采集几个周期之后，查看 GreptimeDB 数据库是否存储指标度量数据，HertzBeat 指标数据图表数据是否展示正常。

直接上图哇:

![1](/img/blog/greptime-1.png)

![1](/img/blog/greptime-2.png)

![1](/img/blog/greptime-3.png)

## 小结

这篇文章带我们体验了如何使用开源时序数据库 GreptimeDB 存储开源实时监控 HertzBeat 的指标度量数据，总的来看两款开源产品上手是非常简单的，关键是如果嫌麻烦不想部署他俩都还有云服务😂让你折腾。
作为特性 [HertzBeat支持GreptimeDB](https://github.com/apache/hertzbeat/pull/834) 的开发者之一，在实际适配使用过程中，GreptimeDB的丝滑原生SDK和类似关系数据库的SQL，让我们从其它时序数据库 `TDengine, IotDB, InfluxDB` 切换过去还是非常容易，体验丝滑的。

GreptimeDB Github: <https://github.com/GreptimeTeam/greptimedb>
HertzBeat Github: <https://github.com/apache/hertzbeat>

**最后就是欢迎大家一定要多多了解，多多使用，多多提意见，多多ISSUE，多多PR，多多Star支持这俩没出来多久希望得到呵护的开源牛牛不怕困难 一颗小星星哦！做开源，我们是蒸(真)的，爱心💗**

感谢此特性 [HertzBeat支持GreptimeDB](https://github.com/apache/hertzbeat/pull/834) 的贡献者们 @zqr10159, @fengjiachun, @killme2008, @tomsun28
