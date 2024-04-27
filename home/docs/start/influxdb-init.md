---
id: influxdb-init  
title: Use Time Series Database InfluxDB to Store Metrics Data (Optional)     
sidebar_label: Use InfluxDB Store Metrics  
---

Apache HertzBeat(Incubating)'s historical data storage relies on the time series database, you can choose one of them to install and initialize, or not to install (note ⚠️ but it is strongly recommended to configure in the production environment)

> It is recommended to use VictoriaMetrics as metrics storage.


**Note⚠️ Time series database is optional, but production environment configuration is strongly recommended to provide more complete historical chart functions and high performance**  
**⚠️ If you do not configure a time series database, only the last hour of historical data is retained.**   
Note⚠️ Need InfluxDB 1.x Version.  

### 1. Use HuaweiCloud GaussDB For Influx

> Use [HuaweiCloud GaussDB For Influx](https://www.huaweicloud.com/product/gaussdbforinflux.html)

> Get the `GaussDB For Influx` service url, username and password config. 

⚠️Note `GaussDB For Influx` enable SSL default, the service url should use `https:`

### 2. Install TDengine via Docker 
> Refer to the official website [installation tutorial](https://hub.docker.com/_/influxdb)  
1. Download and install Docker environment     
   Docker tools download refer to [Docker official document](https://docs.docker.com/get-docker/).     
   After the installation you can check if the Docker version normally output at the terminal.    
   ```
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```
2. Install InfluxDB with Docker     
   ```
   $ docker run -p 8086:8086 \
      -v /opt/influxdb:/var/lib/influxdb \
      influxdb:1.8
   ```
   `-v /opt/influxdb:/var/lib/influxdb` is local persistent mount of InfluxDB data directory. `/opt/influxdb` should be replaced with the actual local directory.     
   use```$ docker ps``` to check if the database started successfully


### Configure the database connection in hertzbeat `application.yml` configuration file  

1. Configure HertzBeat's configuration file   
   Modify `hertzbeat/config/application.yml` configuration file [/script/application.yml](https://github.com/apache/hertzbeat/raw/master/script/application.yml)        
   Note⚠️The docker container way need to mount application.yml file locally, while you can use installation package way to unzip and modify `hertzbeat/config/application.yml`     
   Replace `warehouse.store.influxdb` data source parameters, URL account and password.       

```yaml
warehouse:
   store:
      # disable jpa
      jpa:
         enabled: false
      # enable influxdb
      influxdb:
         enabled: true
         server-url: http://localhost:8086
         username: root
         password: root
         expire-time: '30d'
         replication: 1
```

2. Restart HertzBeat

### FAQ

1. Do both the time series databases InfluxDB, IoTDB and TDengine need to be configured? Can they both be used?

> You don't need to configure all of them, you can choose one of them. Use the enable parameter to control whether it is used or not. You can also install and configure neither, which only affects the historical chart data.
