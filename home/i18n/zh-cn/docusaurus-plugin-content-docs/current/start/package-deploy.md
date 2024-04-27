---
id: package-deploy  
title: 通过安装包安装 HertzBeat    
sidebar_label: 安装包方式部署    
---
> Apache HertzBeat(Incubating) 支持在Linux Windows Mac系统安装运行，CPU支持X86/ARM64。
   
1. 下载HertzBeat安装包
   下载您系统环境对应的安装包 `hertzbeat-xx.tar.gz` `hertzbeat-collector-xx.tar.gz`
   - 从[GITEE Release](https://gitee.com/hertzbeat/hertzbeat/releases) 仓库下载
   - 从[GITHUB Release](https://github.com/apache/hertzbeat/releases) 仓库下载

2. 配置HertzBeat的配置文件(可选)       
   解压安装包到主机 eg: /opt/hertzbeat  
   ``` 
   $ tar zxvf hertzbeat-xx.tar.gz
   or
   $ unzip -o hertzbeat-xx.zip
   ```
   修改位于 `hertzbeat/config/application.yml` 的配置文件(可选)，您可以根据需求修改配置文件     
   - 若需使用邮件发送告警，需替换`application.yml`里面的邮件服务器参数
   - **推荐**若需使用外置Mysql数据库替换内置H2数据库，需替换`application.yml`里面的`spring.datasource`参数 具体步骤参见 [H2数据库切换为MYSQL](mysql-change)）
   - **强烈推荐** 以后我们将主要支持VictoriaMetrics作为时序数据库，若需使用时序数据库VictoriaMetrics来存储指标数据，需替换`application.yml`里面的`warehouse.store.victoria-metrics`参数 具体步骤参见 [使用VictoriaMetrics存储指标数据](victoria-metrics-init)
   - **推荐**若需使用时序数据库TDengine来存储指标数据，需替换`application.yml`里面的`warehouse.store.td-engine`参数 具体步骤参见 [使用TDengine存储指标数据](tdengine-init)
   - **推荐**若需使用时序数据库IotDB来存储指标数据库，需替换`application.yml`里面的`warehouse.storeiot-db`参数 具体步骤参见 [使用IotDB存储指标数据](iotdb-init)

3. 配置用户配置文件(可选,自定义配置用户密码)     
   HertzBeat默认内置三个用户账户,分别为 admin/hertzbeat tom/hertzbeat guest/hertzbeat     
   若需要新增删除修改账户或密码，可以通过修改位于 `hertzbeat/config/sureness.yml` 的配置文件实现，若无此需求可忽略此步骤     
   具体参考 [配置修改账户密码](account-modify)   

4. 部署启动
   执行位于安装目录hertzbeat/bin/下的启动脚本 startup.sh, windows环境下为 startup.bat    
   ``` 
   $ ./startup.sh 
   ```

5. 开始探索HertzBeat  
   浏览器访问 http://ip:1157/ 即刻开始探索使用HertzBeat，默认账户密码 admin/hertzbeat。  

6. 部署采集器集群(可选)
   - 下载解压您系统环境对应采集器安装包`hertzbeat-collector-xx.tar.gz`到规划的另一台部署主机上 [GITEE Release](https://gitee.com/hertzbeat/hertzbeat/releases) [GITHUB Release](https://github.com/apache/hertzbeat/releases)
   - 配置采集器的配置文件 `hertzbeat-collector/config/application.yml` 里面的连接主HertzBeat服务的对外IP，端口，当前采集器名称(需保证唯一性)等参数 `identity` `mode` (public or private) `manager-host` `manager-port`
     ```yaml
     collector:
       dispatch:
         entrance:
           netty:
             enabled: true
             identity: ${IDENTITY:}
             mode: ${MODE:public}
             manager-host: ${MANAGER_HOST:127.0.0.1}
             manager-port: ${MANAGER_PORT:1158}
     ```
   - 启动 `$ ./bin/startup.sh ` 或 `bin/startup.bat`
   - 浏览器访问主HertzBeat服务 `http://localhost:1157` 查看概览页面即可看到注册上来的新采集器

**HAVE FUN**

   
### 安装包部署常见问题

**最多的问题就是网络环境问题，请先提前排查**

1. **若您使用的是不含JDK的安装包，需您提前准备JAVA运行环境**

安装JAVA运行环境-可参考[官方网站](http://www.oracle.com/technetwork/java/javase/downloads/index.html)    
要求：JAVA17环境   
下载JAVA安装包: [镜像站](https://repo.huaweicloud.com/java/jdk/)   
安装后命令行检查是否成功安装
   ```
   $ java -version
   java version "17.0.9"
   Java(TM) SE Runtime Environment 17.0.9 (build 17.0.9+8-LTS-237)
   Java HotSpot(TM) 64-Bit Server VM 17.0.9 (build 17.0.9+8-LTS-237, mixed mode)

   ```

2. **按照流程部署，访问 http://ip:1157/ 无界面**   
   请参考下面几点排查问题：
> 一：若切换了依赖服务MYSQL数据库，排查数据库是否成功创建，是否启动成功
> 二：HertzBeat的配置文件 `hertzbeat/config/application.yml` 里面的依赖服务IP账户密码等配置是否正确    
> 三：若都无问题可以查看 `hertzbeat/logs/` 目录下面的运行日志是否有明显错误，提issue或交流群或社区反馈

3. **日志报错TDengine连接或插入SQL失败**
> 一：排查配置的数据库账户密码是否正确，数据库是否创建   
> 二：若是安装包安装的TDengine2.3+，除了启动server外，还需执行 `systemctl start taosadapter` 启动 adapter    

4. **监控历史图表长时间都一直无数据**
> 一：时序数据库是否配置，未配置则无历史图表数据  
> 二：若使用了Tdengine，排查Tdengine的数据库`hertzbeat`是否创建
> 三: HertzBeat的配置文件 `application.yml` 里面的依赖服务 时序数据库 IP账户密码等配置是否正确   
