---
title: GreptimeDB & HertzBeat, using the open source temporal database GreptimeDB to store metrics for the open source real-time monitoring HertzBeat    
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource, practice]
keywords: [open source monitoring system, open source temporal database, HertzBeat, GreptimeDB]
---

## Using GreptimeDB, an open source temporal database, to store metrics for open source real-time monitoring HertzBeat

### What is GreptimeDB?

> [GreptimeDB](https://github.com/GreptimeTeam/greptimedb) is an open source, distributed, cloud-native temporal database that fuses temporal data processing and analytics.

- Complete ecosystem, support a large number of open protocols, compatible with MySQL/PostreSQL/PromQL/OpenTSDB, etc., low learning cost, out-of-the-box.
- Mixed load of timing and analytics, support for highly concurrent read/write; native support for PromQL, support for SQL/Python for powerful in-library analytics.
- Efficient storage and computation, with object storage and high data compression rate to achieve ultra-low storage costs. Built-in data analytics solution to avoid replicating data to external data warehouses.
- Distributed, Highly Reliable & Highly Available, easily scale each module independently with decoupled cloud-native architecture. Ensure data reliability and availability with configurable replicas and automated failover mechanisms.

Cloud: **[GreptimePlay](https://greptime.com/playground)**

### What is HertzBeat?

> [HertzBeat](https://github.com/apache/hertzbeat) is an open source real-time monitoring and alerting tool with powerful customizable monitoring capabilities and no Agent required.

- HertzBeat is an open source real-time monitoring and alerting tool with powerful customizable monitoring capabilities without the need for an agent. It integrates **Monitoring+Alerting+Notification** All in one, supports monitoring of application services, applications, databases, caching, operating systems, big data, middleware, web servers, cloud native, network, customization, etc., and notifies you of thresholds and alerts all in one step.
- More liberalized threshold rules (calculation expressions), `Email` `Discord` `Slack` `Telegram` `Pinned` `Dingtalk` `WeChat` `Flybook` `SMS` `Webhook` and other ways to deliver in time.
- Configurable `Http, Jmx, Ssh, Snmp, Jdbc, Prometheus` and other protocol specifications, just configure the `YML` monitoring template in the browser to use these protocols to customize the collection of desired metrics.

> With `HertzBeat`'s powerful customization, multi-type support, easy scalability and low coupling, we hope to help developers and small and medium-sized teams to quickly build their own monitoring system.

Cloud: **[TanCloud](https://console.tancloud.cn/)**

### GreptimeDB & HertzBeat

> In the following section, we will demonstrate step-by-step how HertzBeat can be combined with GreptimeDB as a storage to store the collected metrics data.

#### Installing and Deploying GreptimeDB

You can refer to the [official documentation](https://docs.greptime.com/getting-started/overview#docker) for more details.

1. Docker installation of GreptimeDB

    ```shell
    $ docker run -p 4000-4004:4000-4004 \
        -p 4242:4242 -v "$(pwd)/greptimedb:/tmp/greptimedb" \
        --name greptime \
        greptime/greptimedb:0.2.0 standalone start \
        --http-addr 0.0.0.0.0:4000 \
        --rpc-addr 0.0.0.0:4001
    ```

   - `-v "$(pwd)/greptimedb:/tmp/greptimedb"` is the local persistent mount for the greptimeDB data directory, it is recommended to replace `$(pwd)/greptimedb` with the actual local directory you want to specify for storage.

2. Use ``$ docker ps | grep greptime`` to see if GreptimeDB started successfully.

#### Installing and Deploying HertzBeat

See the [official documentation](https://hertzbeat.apache.org/zh-cn/docs/start/docker-deploy) for details.

1. Docker installs HertzBeat.

    ```shell
    $ docker run -d -p 1157:1157 \
        -e LANG=zh_CN.UTF-8 \
        -e TZ=Asia/Shanghai \
        -v /opt/data:/opt/hertzbeat/data \
        -v /opt/application.yml:/opt/hertzbeat/config/application.yml \
        --restart=always \
        --name hertzbeat apache/hertzbeat
    ```

   - `-v /opt/data:/opt/hertzbeat/data` : (Optional, data persistence) Important ⚠️ Mount the H2 database files to the local host to ensure that the data will not be lost due to the creation and deletion of the container

   - `-v /opt/application.yml:/opt/hertzbeat/config/application.yml` : Mount customized local configuration files to the container, i.e. use local configuration files to overwrite the container configuration files.

    Note that the ⚠️ local mount configuration file `application.yml` needs to exist in advance, and the full contents of the file can be found in the project repository [/script/application.yml](<https://github.com/apache/hertzbeat/raw/master/script/> application.yml)

2. Go to <http://ip:1157/> with the default account and password admin/hertzbeat to see if HertzBeat starts successfully.

#### Configure to use GreptimeDB to store HertzBeat monitoring metrics metrics data

1. Modify the HertzBeat configuration file.

    Modify the locally mounted HertzBeat configuration file [application.yml](https://github.com/apache/hertzbeat/raw/master/script/application.yml), in package mode modify `hertzbeat/ config/application.yml

    **Modify the `warehouse.store.jpa.enabled` parameter in there to `false`, configure the `warehouse.store.greptime` datasource parameter in there, the URL account password, and enable `enabled` to `true`**.

    ```yaml
    warehouse:
      store:
        jpa:
          enabled: false
        greptime:
          enabled: true
          endpoint: localhost:4001
    ```

2. Restart HertzBeat.

    ```shell
    docker restart hertzbeat
    ```

#### Observe the authentication effect

1. visit HertzBeat in your browser <http://ip:1157/> default account password admin/hertzbeat
2. Use HertzBeat to add application monitors, such as website monitors, Linux monitors, Mysql monitors, and so on.
3. After monitoring and collecting several cycles, check whether GreptimeDB database stores the metrics data and whether HertzBeat metrics data graph data is displayed normally.

Here's the picture: !

![HertzBeat](/img/blog/greptime-1.png)

![HertzBeat](/img/blog/greptime-2.png)

![HertzBeat](/img/blog/greptime-3.png)

## Summary

This article took us to experience how to use the open source time-series database GreptimeDB to store the metrics data of the open source real-time monitoring HertzBeat, in general, the two open source products is very simple to get started, the key is that if it is too much trouble do not want to deploy both of them still have cloud services 😂 let you toss.
As one of the developers of the feature [HertzBeat supports GreptimeDB](https://github.com/apache/hertzbeat/pull/834), in the actual adaptation process, GreptimeDB's silky-smooth native SDK and relational database-like SQL, let us from other GreptimeDB native SDK and relational database-like SQL make it very easy to switch from other time-series databases like `TDengine, IotDB, InfluxDB` to GreptimeDB, and the experience is very smooth.

GreptimeDB Github: <https://github.com/GreptimeTeam/greptimedb>
HertzBeat Github: <https://github.com/apache/hertzbeat>

**Finally, you are welcome to be more understanding, more use, more comments, more ISSUE, more PR, more Star support these two did not come out for a long time hope to get care of open source cattle are not afraid of difficulties a small star oh! Do open source, we are sincere, love 💗**

Thanks to the contributors of this feature [HertzBeat support GreptimeDB](https://github.com/apache/hertzbeat/pull/834) @zqr10159, @fengjiachun, @killme2008, @tomsun28
