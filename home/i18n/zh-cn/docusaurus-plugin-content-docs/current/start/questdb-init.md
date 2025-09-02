---
id: questdb-init  
title: 依赖时序数据库服务QuestDB安装初始化(可选)  
sidebar_label: 指标数据存储QuestDB
---

Apache HertzBeat™ 的历史数据存储依赖时序数据库，任选其一安装初始化即可，也可不安装(注意⚠️但强烈建议生产环境配置)

> 我们推荐使用并长期支持 VictoriaMetrics 作为存储。

QuestDB 是一款开源的时序数据库，因其高性能和低延迟等特点，在时序数据处理领域备受关注，我们使用其存储分析采集到的监控指标历史数据。

**注意⚠️ 时序数据库安装配置为可选项，但强烈建议生产环境配置，以提供更完善的历史图表功能，高性能和稳定性**

**⚠️ 若不配置时序数据库，则只会留最近一小时历史数据**

> 如果您已有QuestDB环境，可直接跳到YML配置那一步。

### 安装QuestDB

1. 下载安装包

   从官方 GitHub 下载对应系统的最新版本：

   ```shell
   # Linux/macOS（以v7.3.9为例，可替换为最新版本号）
   wget https://github.com/questdb/questdb/releases/download/7.3.9/questdb-7.3.9-no-jre-bin.tar.gz
   
   # 解压
   tar -zxvf questdb-7.3.9-no-jre-bin.tar.gz
   mv questdb-7.3.9 /opt/questdb  # 移动到常用目录
   ```

   Windows 用户：
   下载 zip 包后解压到`C:\questdb`或自定义目录。

2. 启动 QuestDB

   ```shell
   # Linux/macOS：进入安装目录，启动服务
   cd /opt/questdb/bin
   ./questdb start
   
   # Windows（命令提示符）：
   cd C:\questdb\bin
   questdb.exe start
   ```

3. 设置访问密码

   QuestDB 通过配置文件启用认证，需手动修改配置。

   编辑配置文件：

   ```shell
   # Linux/macOS
   vi /opt/questdb/conf/server.conf
   
   # Windows
   notepad C:\questdb\conf\server.conf
   ```

   启用认证并配置密码：

   ```shell
   # 启用认证（默认关闭）
   http.security.enabled=true
   pg.security.enabled=true  # PostgreSQL协议认证
   
   # 设置管理员账号密码（自定义）
   http.security.admin.username=admin
   http.security.admin.password=YourStrongPassword123!
   
   # 可选：限制Web控制台访问IP（如只允许本地）
   http.bind.to=127.0.0.1:9000
   ```

   重启后生效：

   ```shell
   # Linux/macOS
   ./questdb stop
   ./questdb start
   
   # Windows
   questdb.exe stop
   questdb.exe start
   ```

   

4. 在hertzbeat的`application.yml`配置文件配置QuestDB数据库连接

   配置HertzBeat的配置文件
   修改位于 `hertzbeat/config/application.yml` 的配置文件
   注意⚠️docker容器方式需要将application.yml文件挂载到主机本地，安装包方式解压修改位于 `hertzbeat/config/application.yml` 即可

   **修改里面的`warehouse.store.jpa.enabled`参数为`false`， 配置`warehouse.store.questdb`数据源参数，HOST账户密码等，并启用`enabled`为`true`**

   ```yaml
   warehouse:
     store:
       # 关闭默认JPA
       jpa:
         enabled: false
       # 启用IotDB
       questdb:
         enabled: true
         url: localhost:9000
         username: admin
         password: quest
   ```

   

   参数说明：

   | 参数名称 | 参数说明         |
   | -------- | ---------------- |
   | enabled  | 是否启用         |
   | url      | QuestDB的URL地址 |
   | username | QuestDB据库账户  |
   | password | QuestDB据库密码  |

   > **注意：** 因为 QuestDB 架构设计原因，如果对数据的过期时间有要求可以前往 QuestDB 的配置文件 `server.conf` 中配置：
   >
   > ```ini
   > cairo.default.ttl=30d
   > ```

5. 重启 HertzBeat

