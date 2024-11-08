---
id: template  
title: Monitoring Template Here     
sidebar_label: Monitoring Template
---

> Apache HertzBeat (incubating) is an open source, real-time monitoring tool with custom-monitor and agentLess.
>
> We make protocols such as `Http, Jmx, Ssh, Snmp, Jdbc, Prometheus` configurable, and you only need to configure `YML` online to collect any metrics you want.
> Do you believe that you can immediately adapt a new monitoring type such as K8s or Docker just by configuring online?

Here is the architecture.

![hertzBeat](/img/docs/hertzbeat-arch.png)

**We define all monitoring collection types (mysql, website, jvm, k8s) as yml templates**  
**Users can import these templates into the hertzbeat system to support corresponding types of monitoring, which is very convenient!**

![HertzBeat](/img/docs/advanced/extend-point-1.png)

**Welcome everyone to contribute your customized general monitoring type YML template during use. The available templates are as follows:**

### Application service monitoring

&emsp;&#x1F449;&emsp;[Website monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-website.yml) <br />
&emsp;&#x1F449;&emsp;[HTTP API](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-api.yml) <br />
&emsp;&#x1F449;&emsp;[PING Connectivity](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-ping.yml) <br />
&emsp;&#x1F449;&emsp;[Port Telnet](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-port.yml) <br />
&emsp;&#x1F449;&emsp;[Full site monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-fullsite.yml) <br />
&emsp;&#x1F449;&emsp;[SSL Cert monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-ssl_cert.yml) <br />
&emsp;&#x1F449;&emsp;[JVM monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-jvm.yml) <br />
&emsp;&#x1F449;&emsp;[SpringBoot2.0](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-springboot2.yml) <br />
&emsp;&#x1F449;&emsp;[SpringBoot3.0](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-springboot3.yml) <br />
&emsp;&#x1F449;&emsp;[FTP Server](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-ftp.yml) <br />

### Database monitoring

&emsp;&#x1F449;&emsp;[MYSQL database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-mysql.yml) <br />
&emsp;&#x1F449;&emsp;[MariaDB database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-mariadb.yml) <br />
&emsp;&#x1F449;&emsp;[PostgreSQL database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-postgresql.yml) <br />
&emsp;&#x1F449;&emsp;[SqlServer database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-sqlserver.yml) <br />
&emsp;&#x1F449;&emsp;[Oracle database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-oracle.yml) <br />
&emsp;&#x1F449;&emsp;[DM database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-dm.yml) <br />
&emsp;&#x1F449;&emsp;[OpenGauss database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-opengauss.yml) <br />
&emsp;&#x1F449;&emsp;[IoTDB database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-iotdb.yml) <br />
&emsp;&#x1F449;&emsp;[ElasticSearch database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-elasticsearch.yml) <br />
&emsp;&#x1F449;&emsp;[MongoDB database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-mongodb.yml) <br />
&emsp;&#x1F449;&emsp;[ClickHouse database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-clickhouse.yml) <br />
&emsp;&#x1F449;&emsp;[Redis database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-redis.yml) <br />
&emsp;&#x1F449;&emsp;[Redis Sentinel database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-redis_sentinel.yml) <br />
&emsp;&#x1F449;&emsp;[Redis Cluster database monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-redis_cluster.yml) <br />

### Operating system monitoring

&emsp;&#x1F449;&emsp;[Linux operating system monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-linux.yml) <br />
&emsp;&#x1F449;&emsp;[Windows operating system monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-windows.yml) <br />
&emsp;&#x1F449;&emsp;[Ubuntu operating system monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-ubuntu.yml) <br />
&emsp;&#x1F449;&emsp;[Centos operating system monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-centos.yml) <br />
&emsp;&#x1F449;&emsp;[EulerOS operating system monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-euleros.yml) <br />
&emsp;&#x1F449;&emsp;[Fedora CoreOS operating system monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-coreos.yml) <br />
&emsp;&#x1F449;&emsp;[OpenSUSE operating system monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-opensuse.yml) <br />
&emsp;&#x1F449;&emsp;[Rocky Linux operating system monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-rockylinux.yml) <br />
&emsp;&#x1F449;&emsp;[Red Hat operating system monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-redhat.yml) <br />
&emsp;&#x1F449;&emsp;[FreeBSD operating system monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-freebsd.yml) <br />
&emsp;&#x1F449;&emsp;[AlmaLinux operating system monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-almalinux.yml) <br />
&emsp;&#x1F449;&emsp;[Debian operating system monitoring](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-debian.yml) <br />

### Middleware monitoring

&emsp;&#x1F449;&emsp;[Zookeeper](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-zookeeper.yml) <br />
&emsp;&#x1F449;&emsp;[Kafka](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-kafka.yml) <br />
&emsp;&#x1F449;&emsp;[Tomcat](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-tomcat.yml) <br />
&emsp;&#x1F449;&emsp;[ShenYu](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-shenyu.yml) <br />
&emsp;&#x1F449;&emsp;[DynamicTp](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-dynamic_tp.yml) <br />
&emsp;&#x1F449;&emsp;[RabbitMQ](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-rabbitmq.yml) <br />
&emsp;&#x1F449;&emsp;[ActiveMQ](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-activemq.yml) <br />
&emsp;&#x1F449;&emsp;[Jetty](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-jetty.yml) <br />
&emsp;&#x1F449;&emsp;[Flink](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-flink.yml) <br />
&emsp;&#x1F449;&emsp;[Nacos](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-nacos.yml) <br />

### CloudNative monitoring

&emsp;&#x1F449;&emsp;[Docker](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-docker.yml) <br />
&emsp;&#x1F449;&emsp;[Kubernetes](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-kubernetes.yml) <br />

### Network monitoring

&emsp;&#x1F449;&emsp;[CiscoSwitch](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-cisco_switch.yml) <br />
&emsp;&#x1F449;&emsp;[HpeSwitch](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-hpe_switch.yml) <br />
&emsp;&#x1F449;&emsp;[HuaweiSwitch](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-huawei_switch.yml) <br />
&emsp;&#x1F449;&emsp;[TpLinkSwitch](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-tplink_switch.yml) <br />
&emsp;&#x1F449;&emsp;[H3CSwitch](https://raw.githubusercontent.com/apache/hertzbeat/master/hertzbeat-manager/src/main/resources/define/app-h3c_switch.yml) <br />

---

**Have Fun!**
