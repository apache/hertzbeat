---
id: package-deploy  
title: 通过安装包安装HertzBeat    
sidebar_label: 安装包方式部署    
---
> HertzBeat支持在Linux Windows Mac系统安装运行，CPU支持X64/ARM64。由于安装包自身不包含JAVA运行环境，需您提前准备JAVA运行环境。

1. 安装JAVA运行环境-可参考[官方网站](http://www.oracle.com/technetwork/java/javase/downloads/index.html)    
   要求：JDK8+(已验证JDK8)   
   下载JAVA安装包: [镜像站](https://repo.huaweicloud.com/java/jdk/)   
   安装后命令行检查是否成功安装   
   ```
   $ java -version
   openjdk version "1.8.0_312"
   OpenJDK Runtime Environment (Zulu 8.58.0.13-CA-macos-aarch64) (build 1.8.0_312-b07)
   OpenJDK 64-Bit Server VM (Zulu 8.58.0.13-CA-macos-aarch64) (build 25.312-b07, mixed mode)
   ```
2. 下载HertzBeat安装包
   下载您系统环境对应的安装包
   - 从[GITEE Release](https://gitee.com/dromara/hertzbeat/releases) 仓库下载
   - 从[GITHUB Release](https://github.com/dromara/hertzbeat/releases) 仓库下载

3. 配置HertzBeat的配置文件    
   解压安装包到主机 eg: /opt/hertzbeat
   ``` 
   $ tar zxvf hertzbeat-1.0.tar.gz 
   ```
   修改位于 hertzbeat/config/application.yml 的配置文件      
   需要替换里面的MYSQL服务和TDengine服务参数，IP端口账户密码（若使用邮件告警，需替换里面的邮件服务器参数）
   具体替换参数如下:
   ``` 
   spring.datasource.url
   spring.datasource.username
   spring.datasource.password
   
   warehouse.store.td-engine.url
   warehouse.store.td-engine.username
   warehouse.store.td-engine.password
   
   spring.mail.host
   spring.mail.port
   spring.mail.username
   spring.mail.password
   
   ```

4. 部署启动
   执行位于安装目录hertzbeat/bin/下的启动脚本 startup.sh 
   ``` 
   $ ./startup.sh 
   ```
5. 开始探索HertzBeat  
   浏览器访问 http://ip:1157 开始使用HertzBeat进行监控告警。

**HAVE FUN**
