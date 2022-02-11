---
id: docker-deploy  
title: 通过Docker方式安装HertzBeat    
sidebar_label: Docker方式部署    
---

> 推荐使用docker部署HertzBeat  

1. 下载安装Docker环境   
   Docker 工具自身的下载请参考 [Docker官网文档](https://docs.docker.com/get-docker/)。
   安装完毕后终端查看Docker版本是否正常输出。
   ```
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```

2. 拉取HertzBeat Docker镜像   
   镜像版本TAG可查看[官方镜像仓库](https://hub.docker.com/r/tancloud/hertzbeat/tags)     
   ``` 
   $ docker pull tancloud/hertzbeat:latest 
   ```
3. 配置HertzBeat的配置文件  
   在主机目录下创建application.yml，eg:/opt/application.yml   
   配置文件内容参考 项目仓库[/script/application.yml](https://gitee.com/dromara/hertzbeat/raw/master/script/application.yml)，需要替换里面的MYSQL服务和TDengine服务参数，IP端口账户密码（若使用邮件告警，需替换里面的邮件服务器参数）
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

4. 启动HertzBeat Docker容器  
   ``` 
   $ docker run -d -p 1157:1157 -v /opt/application.yml:/opt/hertzbeat/config/application.yml --name hertzbeat tancloud/hertzbeat:latest
   526aa188da767ae94b244226a2b2eec2b5f17dd8eff592893d9ec0cd0f3a1ccd
   ```
   这条命令启动一个运行HertzBeat的Docker容器，并且将容器的1157端口映射到宿主机的1157端口上。若宿主机已有进程占用该端口，则需要修改主机映射端口。
   - docker run -d : 通过Docker运行一个容器,使其在后台运行
   - -p 1157:1157  : 映射容器端口到主机端口
   - -v /opt/application.yml:/opt/hertzbeat/config/application.yml  : 挂载上一步修改的本地配置文件到容器中，即使用本地配置文件覆盖容器配置文件。我们需要修改此配置文件的MYSQL，TDengine配置信息来连接外部服务。
   - --name hertzbeat : 命名容器名称 hertzbeat 
   - tancloud/hertzbeat:latest : 使用拉取的HertzBeat官方发布的应用镜像来启动容器 
   
5. 开始探索HertzBeat  
   浏览器访问 http://ip:1157 开始使用HertzBeat进行监控告警。

**HAVE FUN**
