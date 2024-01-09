### Collector     

Collect Metrics Data from peer-to-peer machine by common protocols.  
使用通用协议远程采集获取对端指标数据。  

support protocols：http/https, jdbc, ssh, telnet, jmx, ping, prometheus...

## Supported

> We define all monitoring collection types such as `mysql`, `jvm`, and `k8s` as `YML` monitoring templates, allowing users to import them to support corresponding types of monitoring.
> Welcome everyone to contribute your customized general monitoring type YML template during use.


- [Website](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-website.yml), [Port Telnet](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-port.yml),
  [Http Api](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-api.yml), [Ping Connect](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-ping.yml),
  [Jvm](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-jvm.yml), [SiteMap](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-fullsite.yml),
  [Ssl Certificate](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-ssl_cert.yml), [SpringBoot2](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-springboot2.yml),
  [FTP Server](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-ftp.yml), [SpringBoot3](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-springboot3.yml)
- [Mysql](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-mysql.yml), [PostgreSQL](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-postgresql.yml),
  [MariaDB](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-mariadb.yml), [Redis](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-redis.yml),
  [ElasticSearch](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-elasticsearch.yml), [SqlServer](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-sqlserver.yml),
  [Oracle](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-oracle.yml), [MongoDB](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-mongodb.yml),
  [DM](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-dm.yml), [OpenGauss](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-opengauss.yml),
  [ClickHouse](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-clickhouse.yml), [IoTDB](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-iotdb.yml),
  [Redis Cluster](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-redis_cluster.yml), [Redis Sentinel](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-redis_sentinel.yml)
- [Linux](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-linux.yml), [Ubuntu](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-ubuntu.yml),
  [CentOS](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-centos.yml), [Windows](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-windows.yml),
  [EulerOS](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-euleros.yml), [Fedora CoreOS](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-coreos.yml),
  [OpenSUSE](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-opensuse.yml), [Rocky Linux](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-rockylinux.yml),
  [Red Hat](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-redhat.yml), [FreeBSD](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-freebsd.yml),
  [AlmaLinux](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-almalinux.yml), [Debian Linux](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-debian.yml)
- [Tomcat](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-tomcat.yml), [Nacos](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-nacos.yml),
  [Zookeeper](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-zookeeper.yml), [RabbitMQ](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-rabbitmq.yml),
  [Flink](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-flink.yml), [Kafka](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-kafka.yml),
  [ShenYu](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-shenyu.yml), [DynamicTp](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-dynamic_tp.yml),
  [Jetty](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-jetty.yml), [ActiveMQ](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-activemq.yml)
- [Kubernetes](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-kubernetes.yml), [Docker](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-docker.yml)
- [CiscoSwitch](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-cisco_switch.yml), [HpeSwitch](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-hpe_switch.yml),
  [HuaweiSwitch](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-huawei_switch.yml), [TpLinkSwitch](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-tplink_switch.yml),
  [H3cSwitch](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-h3c_switch.yml)
- And More Your Custom Template.
- Notified Support `Discord` `Slack` `Telegram` `Email` `DingDing` `WeChat` `FeiShu` `Webhook` `SMS`.

## Build HertzBeat Collector Install Package  

1. Execute command in root

```mvn clean install```

2. Execute command in collector module

```shell
cd collector

mvn clean package -Pcluster
```
