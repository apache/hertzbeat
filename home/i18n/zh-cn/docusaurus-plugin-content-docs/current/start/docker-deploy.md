---
id: docker-deploy  
title: 通过 Docker 方式安装 HertzBeat    
sidebar_label: Docker方式部署    
---

> 推荐使用 Docker 部署 Apache HertzBeat(Incubating)  

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
   镜像版本TAG可查看 [dockerhub 官方镜像仓库](https://hub.docker.com/r/tancloud/hertzbeat/tags)     
   或者使用 [quay.io 镜像仓库](https://quay.io/repository/tancloud/hertzbeat)

   ```shell
   $ docker pull tancloud/hertzbeat   
   $ docker pull tancloud/hertzbeat-collector   
   ```
   若网络超时或者使用
   ```shell
   $ docker pull quay.io/tancloud/hertzbeat
   $ docker pull quay.io/tancloud/hertzbeat-collector   
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

4. 挂载并配置HertzBeat的配置文件(可选)      
   下载 `application.yml` 文件到主机目录下，例如: $(pwd)/application.yml    
   下载源 [github/script/application.yml](https://github.com/apache/hertzbeat/raw/master/script/application.yml) 或 [gitee/script/application.yml](https://gitee.com/hertzbeat/hertzbeat/raw/master/script/application.yml)   
   - 若需使用邮件发送告警，需替换 `application.yml` 里面的邮件服务器参数
   - **推荐**若需使用外置Mysql数据库替换内置H2数据库，需替换`application.yml`里面的`spring.datasource`参数 具体步骤参见 [H2数据库切换为MYSQL](mysql-change)）       
   - **推荐**若需使用时序数据库TDengine来存储指标数据，需替换`application.yml`里面的`warehouse.store.td-engine`参数 具体步骤参见 [使用TDengine存储指标数据](tdengine-init)   
   - **推荐**若需使用时序数据库IotDB来存储指标数据库，需替换`application.yml`里面的`warehouse.storeiot-db`参数 具体步骤参见 [使用IotDB存储指标数据](iotdb-init)    

5. 挂载并配置HertzBeat用户配置文件，自定义用户密码(可选)         
   HertzBeat默认内置三个用户账户,分别为 admin/hertzbeat tom/hertzbeat guest/hertzbeat      
   若需要新增删除修改账户或密码，可以通过配置 `sureness.yml` 实现，若无此需求可忽略此步骤    
   下载 `sureness.yml` 文件到主机目录下，例如: $(pwd)/sureness.yml    
   下载源 [github/script/sureness.yml](https://github.com/apache/hertzbeat/raw/master/script/sureness.yml) 或 [gitee/script/sureness.yml](https://gitee.com/hertzbeat/hertzbeat/raw/master/script/sureness.yml)   
   具体修改步骤参考 [配置修改账户密码](account-modify)   

6. 启动HertzBeat Docker容器    

```shell 
$ docker run -d -p 1157:1157 -p 1158:1158 \
    -e LANG=zh_CN.UTF-8 \
    -e TZ=Asia/Shanghai \
    -v $(pwd)/data:/opt/hertzbeat/data \
    -v $(pwd)/logs:/opt/hertzbeat/logs \
    -v $(pwd)/application.yml:/opt/hertzbeat/config/application.yml \
    -v $(pwd)/sureness.yml:/opt/hertzbeat/config/sureness.yml \
    --restart=always \
    --name hertzbeat tancloud/hertzbeat
```

 	这条命令启动一个运行HertzBeat的Docker容器，并且将容器的1157端口映射到宿主机的1157端口上。若宿主机已有进程占用该端口，则需要修改主机映射端口。  
   - `docker run -d` : 通过Docker运行一个容器,使其在后台运行
   - `-e LANG=zh_CN.UTF-8`  : 设置系统语言
   - `-e TZ=Asia/Shanghai` : 设置系统时区
   - `-p 1157:1157 -p 1158:1158`  : 映射容器端口到主机端口，请注意，前面是宿主机的端口号，后面是容器的端口号。1157是WEB端口，1158是集群端口。
   - `-v $(pwd)/data:/opt/hertzbeat/data` : (可选，数据持久化)重要⚠️ 挂载H2数据库文件到本地主机，保证数据不会因为容器的创建删除而丢失
   - `-v $(pwd)/logs:/opt/hertzbeat/logs` : (可选，不需要可删除)挂载日志文件到本地主机，保证日志不会因为容器的创建删除而丢失，方便查看
   - `-v $(pwd)/application.yml:/opt/hertzbeat/config/application.yml`  : (可选,不需要可删除)挂载上上一步修改的本地配置文件到容器中，即使用本地配置文件覆盖容器配置文件。我们需要修改此配置文件的MYSQL，TDengine配置信息来连接外部服务。
   - `-v $(pwd)/sureness.yml:/opt/hertzbeat/config/sureness.yml`  : (可选,不需要可删除)挂载上一步修改的账户配置文件到容器中，若无修改账户需求可删除此命令参数。  

   - 注意⚠️ 挂载文件时，前面参数为你自定义本地文件地址，后面参数为docker容器内文件地址(固定)  

   - `--name hertzbeat` : 命名容器名称 hertzbeat 

   - `--restart=always`：(可选，不需要可删除)使容器在Docker启动后自动重启。若您未在容器创建时指定该参数，可通过以下命令实现该容器自启。

     ```shell
     $ docker update --restart=always hertzbeat
     ```

   - `tancloud/hertzbeat` : 使用拉取最新的的HertzBeat官方发布的应用镜像来启动容器,**若使用`quay.io`镜像需用参数`quay.io/tancloud/hertzbeat`代替。**   

7. 开始探索HertzBeat  
   浏览器访问 http://ip:1157/ 即可开始探索使用HertzBeat，默认账户密码 admin/hertzbeat。  

8. 部署采集器集群(可选)

```shell 
$ docker run -d \
    -e IDENTITY=custom-collector-name \
    -e MODE=public \
    -e MANAGER_HOST=127.0.0.1 \
    -e MANAGER_PORT=1158 \
    --name hertzbeat-collector tancloud/hertzbeat-collector
```

   这条命令启动一个运行HertzBeat采集器的Docker容器，并直连上了HertzBeat主服务节点。 
   - `docker run -d` : 通过Docker运行一个容器,使其在后台运行
   - `-e IDENTITY=custom-collector-name`  : (可选) 设置采集器的唯一标识名称。⚠️注意多采集器时采集器名称需保证唯一性。  
   - `-e MODE=public` : 配置运行模式(public or private), 公共集群模式或私有云边模式。
   - `-e MANAGER_HOST=127.0.0.1` : 重要⚠️ 设置连接的主HertzBeat服务地址IP。
   - `-e MANAGER_PORT=1158` :  (可选) 设置连接的主HertzBeat服务地址端口，默认 1158.
   - `-v $(pwd)/logs:/opt/hertzbeat-collector/logs` : (可选，不需要可删除)挂载日志文件到本地主机，保证日志不会因为容器的创建删除而丢失，方便查看
   - `--name hertzbeat-collector` : 命名容器名称 hertzbeat-collector
   - `tancloud/hertzbeat-collector` : 使用拉取最新的的HertzBeat采集器官方发布的应用镜像来启动容器,**若使用`quay.io`镜像需用参数`quay.io/tancloud/hertzbeat-collector`代替。**   

8. 浏览器访问主HertzBeat服务 `http://localhost:1157` 查看概览页面即可看到注册上来的新采集器  

**HAVE FUN**   

### Docker部署常见问题   

**最多的问题就是网络问题，请先提前排查**

1. **MYSQL,TDENGINE或IotDB和HertzBeat都Docker部署在同一主机上，HertzBeat使用localhost或127.0.0.1连接数据库失败**     
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
> 一：Tdengine或IoTDB是否配置，未配置则无历史图表数据  
> 二：Tdengine的数据库`hertzbeat`是否创建
> 三: HertzBeat的配置文件 `application.yml` 里面的依赖服务 IotDB或Tdengine IP账户密码等配置是否正确  

5. 监控页面历史图表不显示，弹出 [无法提供历史图表数据，请配置依赖时序数据库]
> 如弹窗所示，历史图表展示的前提是需要安装配置hertzbeat的依赖服务 -
> 安装初始化此数据库参考 [TDengine安装初始化](tdengine-init) 或 [IoTDB安装初始化](iotdb-init)  

6. 安装配置了时序数据库，但页面依旧显示弹出 [无法提供历史图表数据，请配置依赖时序数据库]
> 请检查配置参数是否正确
> iot-db 或td-engine enable 是否设置为true
> 注意⚠️若hertzbeat和IotDB，TDengine都为docker容器在同一主机下启动，容器之间默认不能用127.0.0.1通讯，改为主机IP
> 可根据logs目录下启动日志排查


