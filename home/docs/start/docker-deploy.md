---
id: docker-deploy  
title: 通过Docker方式安装HertzBeat    
sidebar_label: Docker方式部署    
---

> 推荐使用Docker部署HertzBeat  

安装部署视频教程: [HertzBeat安装部署-BiliBili](https://www.bilibili.com/video/BV1GY41177YL)  

1. 下载安装Docker环境   
   Docker 工具自身的下载请参考以下资料：  
    [Docker官网文档](https://docs.docker.com/get-docker/)
   [菜鸟教程-Docker教程](https://www.runoob.com/docker/docker-tutorial.html)
   安装完毕后终端查看Docker版本是否正常输出。

   ```
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```

2. 拉取HertzBeat Docker镜像   
   镜像版本TAG可查看[官方镜像仓库](https://hub.docker.com/r/tancloud/hertzbeat/tags)     

   ``` shell
   $ docker pull tancloud/hertzbeat   
   ```

3. 部署HertzBeat您可能需要掌握的几条命令

   ```shell
   #查看所有容器(在运行和已经停止运行的容器)
   $ docker ps -a
   #启动/终止/重启/运行状态
   $ docker start/stop/restart/stats 容器id或者容器名
   #进入容器并打开容器的shell终端
   $ docker exec -it 容器id或者容器名 /bin/bash
   #退出容器终端
   ctrl+p然后ctrl+q
   #完全退出容器的终端 
   ctrl+d或者
   $ exit
   ```

4. 配置HertzBeat的配置文件(可选)      
   在主机目录下创建application.yml，eg:/opt/application.yml        
   配置文件内容参考 项目仓库[/script/application.yml](https://gitee.com/dromara/hertzbeat/raw/master/script/application.yml)，替换里面的`td-engine`服务参数，IP端口账户密码   
   注意⚠️（若使用邮件告警，需替换里面的邮件服务器参数。若使用MYSQL数据源，需替换里面的datasource参数 参见[H2数据库切换为MYSQL](mysql-change)）       
   具体替换参数如下:     
```yaml
warehouse:
   store:
      td-engine:
         enabled: true
         driver-class-name: com.taosdata.jdbc.rs.RestfulDriver
         url: jdbc:TAOS-RS://localhost:6041/hertzbeat
         username: root
         password: taosdata
         
spring:
   mail:
      # 请注意此为邮件服务器地址：qq邮箱为 smtp.qq.com qq企业邮箱为 smtp.exmail.qq.com
      host: smtp.exmail.qq.com
      username: example@tancloud.cn
      # 请注意此非邮箱账户密码 此需填写邮箱授权码
      password: example
      port: 465
```

4. 配置用户配置文件(可选,自定义配置用户密码)         
   HertzBeat默认内置三个用户账户,分别为 admin/hertzbeat tom/hertzbeat guest/hertzbeat      
   若需要新增删除修改账户或密码，可以通过配置 `sureness.yml` 实现，若无此需求可忽略此步骤    
   在主机目录下创建sureness.yml，eg:/opt/sureness.yml    
   配置文件内容参考 项目仓库[/script/sureness.yml](https://gitee.com/dromara/hertzbeat/blob/master/script/sureness.yml)    
```yaml

resourceRole:
   - /api/account/auth/refresh===post===[admin,user,guest]
   - /api/apps/**===get===[admin,user,guest]
   - /api/monitor/**===get===[admin,user,guest]
   - /api/monitor/**===post===[admin,user]
   - /api/monitor/**===put===[admin,user]
   - /api/monitor/**===delete==[admin]
   - /api/monitors/**===get===[admin,user,guest]
   - /api/monitors/**===post===[admin,user]
   - /api/monitors/**===put===[admin,user]
   - /api/monitors/**===delete===[admin]
   - /api/alert/**===get===[admin,user,guest]
   - /api/alert/**===post===[admin,user]
   - /api/alert/**===put===[admin,user]
   - /api/alert/**===delete===[admin]
   - /api/alerts/**===get===[admin,user,guest]
   - /api/alerts/**===post===[admin,user]
   - /api/alerts/**===put===[admin,user]
   - /api/alerts/**===delete===[admin]
   - /api/notice/**===get===[admin,user,guest]
   - /api/notice/**===post===[admin,user]
   - /api/notice/**===put===[admin,user]
   - /api/notice/**===delete===[admin]
   - /api/tag/**===get===[admin,user,guest]
   - /api/tag/**===post===[admin,user]
   - /api/tag/**===put===[admin,user]
   - /api/tag/**===delete===[admin]
   - /api/summary/**===get===[admin,user,guest]
   - /api/summary/**===post===[admin,user]
   - /api/summary/**===put===[admin,user]
   - /api/summary/**===delete===[admin]

# 需要被过滤保护的资源,不认证鉴权直接访问
# /api/v1/source3===get 表示 /api/v1/source3===get 可以被任何人访问 无需登录认证鉴权
excludedResource:
   - /api/account/auth/**===*
   - /api/i18n/**===get
   - /api/apps/hierarchy===get
   # web ui 前端静态资源
   - /===get
   - /dashboard/**===get
   - /monitors/**===get
   - /alert/**===get
   - /account/**===get
   - /setting/**===get
   - /passport/**===get
   - /**/*.html===get
   - /**/*.js===get
   - /**/*.css===get
   - /**/*.ico===get
   - /**/*.ttf===get
   - /**/*.png===get
   - /**/*.gif===get
   - /**/*.jpg===get
   - /**/*.svg===get
   - /**/*.json===get
   # swagger ui 资源
   - /swagger-resources/**===get
   - /v2/api-docs===get
   - /v3/api-docs===get

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

6. 启动HertzBeat Docker容器    

```shell 
$ docker run -d -p 1157:1157 \
    -e LANG=zh_CN.UTF-8 \
    -e TZ=Asia/Shanghai \
    -v /opt/data:/opt/hertzbeat/data \
    -v /opt/logs:/opt/hertzbeat/logs \
    -v /opt/application.yml:/opt/hertzbeat/config/application.yml \
    -v /opt/sureness.yml:/opt/hertzbeat/config/sureness.yml \
    --restart=always \
    --name hertzbeat tancloud/hertzbeat
```

 	这条命令启动一个运行HertzBeat的Docker容器，并且将容器的1157端口映射到宿主机的1157端口上。若宿主机已有进程占用该端口，则需要修改主机映射端口。  
   - `docker run -d` : 通过Docker运行一个容器,使其在后台运行

   - `-p 1157:1157`  : 映射容器端口到主机端口，请注意，前面是宿主机的端口号，后面是容器的端口号。

   - `-e LANG=zh_CN.UTF-8`  : (可选) 设置语言

   - `-e TZ=Asia/Shanghai` : (可选) 设置时区

   - `-v /opt/data:/opt/hertzbeat/data` : (可选，数据持久化)重要⚠️ 挂载H2数据库文件到本地主机，保证数据不会因为容器的创建删除而丢失  

   - `-v /opt/logs:/opt/hertzbeat/logs` : (可选，不需要可删除)挂载日志文件到本地主机，保证日志不会因为容器的创建删除而丢失，方便查看  

   - `-v /opt/application.yml:/opt/hertzbeat/config/application.yml`  : (可选,不需要可删除)挂载上上一步修改的本地配置文件到容器中，即使用本地配置文件覆盖容器配置文件。我们需要修改此配置文件的MYSQL，TDengine配置信息来连接外部服务。

   - `-v /opt/sureness.yml:/opt/hertzbeat/config/sureness.yml`  : (可选,不需要可删除)挂载上一步修改的账户配置文件到容器中，若无修改账户需求可删除此命令参数。  

   - 注意⚠️ 挂载文件时，前面参数为你自定义本地文件地址，后面参数为docker容器内文件地址(固定)  

   - `--name hertzbeat` : 命名容器名称 hertzbeat 

   - `--restart=always`：(可选，不需要可删除)使容器在Docker启动后自动重启。若您未在容器创建时指定该参数，可通过以下命令实现该容器自启。

     ```shell
     $ docker update --restart=always hertzbeat
     ```

   - `tancloud/hertzbeat` : 使用拉取最新的的HertzBeat官方发布的应用镜像来启动容器,版本可查看[官方镜像仓库](https://hub.docker.com/r/tancloud/hertzbeat/tags)   

7. 开始探索HertzBeat  
   浏览器访问 http://ip:1157/ 开始使用HertzBeat进行监控告警，默认账户密码 admin/hertzbeat。  

**HAVE FUN**   

### Docker部署常见问题   

1. **MYSQL,TDENGINE和HertzBeat都Docker部署在同一主机上，HertzBeat使用localhost或127.0.0.1连接数据库失败**     
此问题本质为Docker容器访问宿主机端口连接失败，由于docker默认网络模式为Bridge模式，其通过localhost访问不到宿主机。
> 解决办法一：配置application.yml将数据库的连接地址由localhost修改为宿主机的对外IP     
> 解决办法二：使用Host网络模式启动Docker，即使Docker容器和宿主机共享网络 `docker run -d --network host .....`   

2. **按照流程部署，访问 http://ip:1157/ 无界面**   
请参考下面几点排查问题：  
> 一：若切换了依赖服务MYSQL数据库，排查数据库是否成功创建，是否启动成功
> 二：HertzBeat的配置文件 `application.yml` 里面的依赖服务IP账户密码等配置是否正确  
> 三：若都无问题可以 `docker logs hertzbeat` 查看容器日志是否有明显错误，提issue或交流群或社区反馈

3. **日志报错TDengine连接或插入SQL失败**  
> 一：排查配置的数据库账户密码是否正确，数据库是否创建   
> 二：若是安装包安装的TDengine2.3+，除了启动server外，还需执行 `systemctl start taosadapter` 启动 adapter    

4. **监控历史图表长时间都一直无数据**  
> 一：Tdengine是否配置，未配置则无历史图表数据  
> 二：Tdengine的数据库`hertzbeat`是否创建
> 三: HertzBeat的配置文件 `application.yml` 里面的依赖服务 Tdengine IP账户密码等配置是否正确  

5. 监控页面历史图表不显示，弹出 [无法提供历史图表数据，请配置依赖服务TDengine时序数据库]
> 如弹窗所示，历史图表展示的前提是需要安装配置hertzbeat的依赖服务 -
> 安装初始化此数据库参考 [TDengine安装初始化](tdengine-init)  


6. 监控详情历史图片不展示或无数据，已经配置了TDengine    
> 请确认是否安装的TDengine版本为2.4.0.12附近，版本3.0和2.2不支持兼容
