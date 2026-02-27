##  docker-compose部署 HertzBeat+Mysql+IoTDB 方案   

- 如果想自己本地快速部署的话，可以参考下面进行操作。

> docker-compose 部署方案使用了 Mysql + IoTDB 作为 Hertzbeat 依赖存储服务。   
> 此方案会启动三个容器服务 Mysql, IoTDB, HertzBeat   

##### 安装Docker & Docker-compose

1. 下载安装 docker 环境 & docker-compose 环境
   请参考 [Docker官网文档](https://docs.docker.com/get-docker/), [Compose安装](https://docs.docker.com/compose/install/)       
   ```
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```

##### docker compose部署hertzbeat及其依赖服务     

1. 下载hertzbeat-docker-compose安装部署脚本文件  
   脚本文件位于代码仓库下`script/docker-compose/hertzbeat-mysql-iotdb` 链接 [script/docker-compose](https://github.com/apache/hertzbeat/tree/master/script/docker-compose/hertzbeat-mysql-iotdb)

2. 添加 MYSQL jdbc 驱动 jar
   下载 MYSQL jdbc driver jar, 例如 mysql-connector-java-8.0.25.jar. https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-8.0.25.zip
   将此 jar 包拷贝放入 ext-lib 目录下.

3. 进入部署脚本 docker-compose 目录, 执行  

   `docker compose up -d`


##### 开始探索HertzBeat   

浏览器访问 `localhost:1157` 即可开始，默认账号密码 `admin/hertzbeat`  

---   

怎么样是不是很简单，只要几分钟就可以部署完成，赶紧试试吧！
