---
id: package-deploy  
title: 通过安装包安装 HertzBeat    
sidebar_label: 安装包方式部署    
---
> HertzBeat支持在Linux Windows Mac系统安装运行，CPU支持X86/ARM64。    
> 由于安装包自身不包含JAVA运行环境，需您提前准备JAVA运行环境。   

1. 安装JAVA运行环境-可参考[官方网站](http://www.oracle.com/technetwork/java/javase/downloads/index.html)    
   要求：JAVA11环境   
   下载JAVA安装包: [镜像站](https://repo.huaweicloud.com/java/jdk/)   
   安装后命令行检查是否成功安装   
   ```
   $ java -version
   java version "11.0.12"
   Java(TM) SE Runtime Environment 18.9 (build 11.0.12+8-LTS-237)
   Java HotSpot(TM) 64-Bit Server VM 18.9 (build 11.0.12+8-LTS-237, mixed mode)

   ```
2. 下载HertzBeat安装包
   下载您系统环境对应的安装包
   - 从[GITEE Release](https://gitee.com/dromara/hertzbeat/releases) 仓库下载
   - 从[GITHUB Release](https://github.com/dromara/hertzbeat/releases) 仓库下载

3. 配置HertzBeat的配置文件(可选)       
   解压安装包到主机 eg: /opt/hertzbeat  
   ``` 
   $ tar zxvf hertzbeat-[版本号].tar.gz   
   ```
   修改位于 `hertzbeat/config/application.yml` 的配置文件(可选)，您可以根据需求修改配置文件     
   - 若需使用邮件发送告警，需替换`application.yml`里面的邮件服务器参数
   - **推荐**若需使用外置Mysql数据库替换内置H2数据库，需替换`application.yml`里面的`spring.datasource`参数 具体步骤参见 [H2数据库切换为MYSQL](mysql-change)）
   - **推荐**若需使用时序数据库TDengine来存储指标数据，需替换`application.yml`里面的`warehouse.store.td-engine`参数 具体步骤参见 [使用TDengine存储指标数据](tdengine-init)
   - **推荐**若需使用时序数据库IotDB来存储指标数据库，需替换`application.yml`里面的`warehouse.storeiot-db`参数 具体步骤参见 [使用IotDB存储指标数据](iotdb-init)

4. 配置用户配置文件(可选,自定义配置用户密码)     
   HertzBeat默认内置三个用户账户,分别为 admin/hertzbeat tom/hertzbeat guest/hertzbeat     
   若需要新增删除修改账户或密码，可以通过修改位于 `hertzbeat/config/sureness.yml` 的配置文件实现，若无此需求可忽略此步骤     
   具体参考 [配置修改账户密码](account-modify)   

5. 部署启动
   执行位于安装目录hertzbeat/bin/下的启动脚本 startup.sh, windows环境下为 startup.bat    
   ``` 
   $ ./startup.sh 
   ```
6. 开始探索HertzBeat  
   浏览器访问 http://ip:1157/ 即刻开始探索使用HertzBeat，默认账户密码 admin/hertzbeat。  

**HAVE FUN**

### 安装包部署常见问题

**最多的问题就是网络问题，请先提前排查**

1. **按照流程部署，访问 http://ip:1157/ 无界面**   
   请参考下面几点排查问题：
> 一：若切换了依赖服务MYSQL数据库，排查数据库是否成功创建，是否启动成功
> 二：HertzBeat的配置文件 `hertzbeat/config/application.yml` 里面的依赖服务IP账户密码等配置是否正确    
> 三：若都无问题可以查看 `hertzbeat/logs/` 目录下面的运行日志是否有明显错误，提issue或交流群或社区反馈

2. **日志报错TDengine连接或插入SQL失败**
> 一：排查配置的数据库账户密码是否正确，数据库是否创建   
> 二：若是安装包安装的TDengine2.3+，除了启动server外，还需执行 `systemctl start taosadapter` 启动 adapter    

3. **监控历史图表长时间都一直无数据**
> 一：Tdengine或IoTDB是否配置，未配置则无历史图表数据  
> 二：若使用了Tdengine，排查Tdengine的数据库`hertzbeat`是否创建
> 三: HertzBeat的配置文件 `application.yml` 里面的依赖服务 IotDB 或 Tdengine IP账户密码等配置是否正确   
