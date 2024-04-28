---
id: template  
title: 监控模版中心     
sidebar_label: 监控模版
---

> Apache HertzBeat(Incubating) 是一个拥有强大自定义监控能力，无需 Agent 的开源实时监控告警工具。  

> 我们将`Http, Jmx, Ssh, Snmp, Jdbc, Prometheus`等协议规范可配置化，您只需在浏览器配置`YML`就能使用这些协议去自定义采集任何您想要的指标。    
> 您相信只需配置下就能立刻适配一款`K8s`或`Docker`等新的监控类型吗？

这是它的架构原理:   

![hertzBeat](/img/docs/hertzbeat-arch.png)

**我们将所有监控采集类型(mysql,website,jvm,k8s)都定义为yml模版，用户可以导入这些模版到hertzbeat系统中，使其支持对应类型的监控，非常方便！** 

![](/img/docs/advanced/extend-point-1.png)

**欢迎大家一起贡献你使用过程中自定义的通用监控类型YML模版，可用的模板如下:**

### 应用服务监控模版 

&emsp;&#x1F449;&emsp;[Website monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-website.yml) <br />
&emsp;&#x1F449;&emsp;[HTTP API](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-api.yml) <br /> 
&emsp;&#x1F449;&emsp;[PING Connectivity](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-ping.yml) <br /> 
&emsp;&#x1F449;&emsp;[Port Telnet](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-port.yml) <br /> 
&emsp;&#x1F449;&emsp;[Full site monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-fullsite.yml) <br />
&emsp;&#x1F449;&emsp;[SSL Cert monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-ssl_cert.yml) <br />
&emsp;&#x1F449;&emsp;[JVM monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-jvm.yml) <br />
&emsp;&#x1F449;&emsp;[SpringBoot2.0](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-springboot2.yml) <br />
&emsp;&#x1F449;&emsp;[SpringBoot3.0](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-springboot3.yml) <br />
&emsp;&#x1F449;&emsp;[FTP Server](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-ftp.yml) <br />

### 数据库监控模版  

&emsp;&#x1F449;&emsp;[MYSQL database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-mysql.yml) <br />
&emsp;&#x1F449;&emsp;[MariaDB database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-mariadb.yml) <br />
&emsp;&#x1F449;&emsp;[PostgreSQL database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-postgresql.yml) <br />
&emsp;&#x1F449;&emsp;[SqlServer database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-sqlserver.yml) <br />
&emsp;&#x1F449;&emsp;[Oracle database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-oracle.yml) <br />
&emsp;&#x1F449;&emsp;[DM database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-dm.yml) <br />
&emsp;&#x1F449;&emsp;[OpenGauss database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-opengauss.yml) <br />
&emsp;&#x1F449;&emsp;[IoTDB database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-iotdb.yml) <br />
&emsp;&#x1F449;&emsp;[ElasticSearch database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-elasticsearch.yml) <br />
&emsp;&#x1F449;&emsp;[MongoDB database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-mongodb.yml) <br />
&emsp;&#x1F449;&emsp;[ClickHouse database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-clickhouse.yml) <br />
&emsp;&#x1F449;&emsp;[Redis database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-redis.yml) <br />
&emsp;&#x1F449;&emsp;[Redis Sentinel database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-redis_sentinel.yml) <br />
&emsp;&#x1F449;&emsp;[Redis Cluster database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-redis_cluster.yml) <br />

### 操作系统监控模版     

&emsp;&#x1F449;&emsp;[Linux operating system monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-linux.yml) <br />
&emsp;&#x1F449;&emsp;[Windows operating system monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-windows.yml) <br />
&emsp;&#x1F449;&emsp;[Ubuntu operating system monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-ubuntu.yml) <br />
&emsp;&#x1F449;&emsp;[Centos operating system monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-centos.yml) <br />
&emsp;&#x1F449;&emsp;[EulerOS operating system monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-euleros.yml) <br />
&emsp;&#x1F449;&emsp;[Fedora CoreOS operating system monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-coreos.yml) <br />
&emsp;&#x1F449;&emsp;[OpenSUSE operating system monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-opensuse.yml) <br />
&emsp;&#x1F449;&emsp;[Rocky Linux operating system monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-rockylinux.yml) <br />
&emsp;&#x1F449;&emsp;[Red Hat operating system monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-redhat.yml) <br />
&emsp;&#x1F449;&emsp;[FreeBSD operating system monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-freebsd.yml) <br />
&emsp;&#x1F449;&emsp;[AlmaLinux operating system monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-almalinux.yml) <br />
&emsp;&#x1F449;&emsp;[Debian operating system monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-debian.yml) <br />


### 中间件监控模版

&emsp;&#x1F449;&emsp;[Zookeeper](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-zookeeper.yml) <br />
&emsp;&#x1F449;&emsp;[Kafka](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-kafka.yml) <br />
&emsp;&#x1F449;&emsp;[Tomcat](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-tomcat.yml) <br />
&emsp;&#x1F449;&emsp;[ShenYu](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-shenyu.yml) <br />
&emsp;&#x1F449;&emsp;[DynamicTp](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-dynamic_tp.yml) <br />
&emsp;&#x1F449;&emsp;[RabbitMQ](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-rabbitmq.yml) <br />
&emsp;&#x1F449;&emsp;[ActiveMQ](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-activemq.yml) <br />
&emsp;&#x1F449;&emsp;[Jetty](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-jetty.yml) <br />
&emsp;&#x1F449;&emsp;[Flink](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-flink.yml) <br />
&emsp;&#x1F449;&emsp;[Nacos](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-nacos.yml) <br />


### 云原生监控模版

&emsp;&#x1F449;&emsp;[Docker](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-docker.yml) <br />
&emsp;&#x1F449;&emsp;[Kubernetes](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-kubernetes.yml) <br />

### 网络监控模版 

&emsp;&#x1F449;&emsp;[CiscoSwitch](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-cisco_switch.yml) <br />
&emsp;&#x1F449;&emsp;[HpeSwitch](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-hpe_switch.yml) <br />
&emsp;&#x1F449;&emsp;[HuaweiSwitch](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-huawei_switch.yml) <br />
&emsp;&#x1F449;&emsp;[TpLinkSwitch](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-tplink_switch.yml) <br />
&emsp;&#x1F449;&emsp;[H3CSwitch](https://raw.githubusercontent.com/apache/hertzbeat/master/manager/src/main/resources/define/app-h3c_switch.yml) <br />

---

**Have Fun!**
