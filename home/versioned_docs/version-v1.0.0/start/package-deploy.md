---
id: package-deploy  
title: 通过安装包安装HertzBeat    
sidebar_label: 安装包方式部署    
---
> HertzBeat支持在Linux Windows Mac系统安装运行，CPU支持X86/ARM64。由于安装包自身不包含JAVA运行环境，需您提前准备JAVA运行环境。

安装部署视频教程: [HertzBeat安装部署-BiliBili](https://www.bilibili.com/video/BV1GY41177YL)   

1. 安装JAVA运行环境-可参考[官方网站](http://www.oracle.com/technetwork/java/javase/downloads/index.html)    
   要求：JDK8+(已验证JDK8)   
   下载JAVA安装包: [镜像站](https://repo.huaweicloud.com/java/jdk/)   
   安装后命令行检查是否成功安装   
   ```
   $ java -version
   openjdk version "11.0.11" 2021-04-20
   OpenJDK Runtime Environment AdoptOpenJDK-11.0.11+9 (build 11.0.11+9)
   OpenJDK 64-Bit Server VM AdoptOpenJDK-11.0.11+9 (build 11.0.11+9, mixed mode)
   ```
2. 下载HertzBeat安装包
   下载您系统环境对应的安装包
   - 从[GITEE Release](https://gitee.com/dromara/hertzbeat/releases) 仓库下载
   - 从[GITHUB Release](https://github.com/dromara/hertzbeat/releases) 仓库下载

3. 配置HertzBeat的配置文件    
   解压安装包到主机 eg: /opt/hertzbeat
   ``` 
   $ tar zxvf hertzbeat-[版本号].tar.gz 
   ```
   修改位于 `hertzbeat/config/application.yml` 的配置文件      
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

4. 配置用户配置文件(非必须,配置账户需要)     
   HertzBeat默认内置三个用户账户,分别为 admin/hertzbeat tom/hertzbeat guest/hertzbeat   
   若需要新增删除修改账户或密码，可以通过修改位于 `hertzbeat/config/sureness.yml` 的配置文件实现，若无此需求可忽略此步骤 
   修改sureness.yml的如下**部分参数**：**[注意⚠️sureness配置的其它默认参数需保留]**

```yaml

# 用户账户信息
# 下面有 admin tom lili 三个账户
# eg: admin 拥有[admin,user]角色,密码为hertzbeat
# eg: tom 拥有[user],密码为hertzbeat
# eg: lili 拥有[guest],明文密码为lili, 加盐密码为1A676730B0C7F54654B0E09184448289
account:
   - appId: admin
     credential: hertzbeat
     role: [admin,user]
   - appId: tom
     credential: hertzbeat
     role: [user]
   - appId: guest
     credential: hertzbeat
     role: [guest]
 
```

5. 部署启动
   执行位于安装目录hertzbeat/bin/下的启动脚本 startup.sh 
   ``` 
   $ ./startup.sh 
   ```
6. 开始探索HertzBeat  
   浏览器访问 http://ip:1157/ 开始使用HertzBeat进行监控告警，默认账户密码 admin/hertzbeat。  

**HAVE FUN**

### 安装包部署常见问题

1. **按照流程部署，访问 http://ip:1157/ 无界面**   
   请参考下面几点排查问题：
> 一：依赖服务MYSQL数据库，TDENGINE数据库是否已按照启动成功，对应hertzbeat数据库是否已创建，SQL脚本是否执行    
> 二：HertzBeat的配置文件 `hertzbeat/config/application.yml` 里面的依赖服务IP账户密码等配置是否正确    
> 三：若都无问题可以查看 `hertzbeat/logs/` 目录下面的运行日志是否有明显错误，提issue或交流群或社区反馈

2. **日志报错TDengine连接或插入SQL失败**
> 一：排查配置的数据库账户密码是否正确，数据库是否创建   
> 二：若是安装包安装的TDengine2.3+，除了启动server外，还需执行 `systemctl start taosadapter` 启动 adapter    
