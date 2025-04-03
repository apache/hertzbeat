---
id: 1.6.0-update  
title: 如何升级到1.6.0     
sidebar_label: 1.6.0升级指南
---

## HertzBeat 1.6.0 升级指南

### 注意：该指南适用于1.5.0向1.6.0版本升级

### 如果你使用更老的版本，建议使用导出功能重新安装，或先升级到1.5.0再按本指南升级到1.6.0

### 二进制安装包升级

1. 升级Java环境

    由于1.6.0版本使用Java17，且安装包不再提供内置jdk的版本，参考以下情况使用新版Hertzbeat。

   - 当你的服务器中默认环境变量为Java17时，这一步你无需任何操作。
   - 当你的服务器中默认环境变量不为Java17时，如Java8、Java11，若你服务器中**没有**其他应用需要低版本Java，根据你的系统，到 [https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html](https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html) 选择相应的发行版下载，并在搜索引擎搜索如何设置新的环境变量指向新的Java17。
   - 当你的服务器中默认环境变量不为Java17时，如Java8、Java11，若你服务器中**有**其他应用需要低版本Java，根据你的系统，到 [https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html](https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html) 选择相应的发行版下载，并将解压后的文件夹重命名为java，复制到Hertzbeat的解压目录下。

2. 升级数据库

    打开[https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager/src/main/resources/db/migration](https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager/src/main/resources/db/migration)，
    选择你使用的数据库的目录下相应的 `V160__update_column.sql`文件执行升级sql。

3. 升级配置文件

    由于 `application.yml`和 `sureness.yml`更新变动较大，建议直接使用新的yml配置文件，然后在自己的需求基础上进行修改。

   - `application.yml`一般需要修改以下部分

     默认为：

    ```yaml
      datasource:
        driver-class-name: org.h2.Driver
        username: sa
        password: 123456
        url: jdbc:h2:./data/hertzbeat;MODE=MYSQL
        hikari:
          max-lifetime: 120000
    
      jpa:
        show-sql: false
        database-platform: org.eclipse.persistence.platform.database.MySQLPlatform
        database: h2
        properties:
          eclipselink:
            logging:
              level: SEVERE
    ```

    如若修改为mysql数据库，给出一个示例：

    ```yaml
      datasource:
        driver-class-name: com.mysql.cj.jdbc.Driver
        username: root
        password: root
        url: jdbc:mysql://localhost:3306/hertzbeat?useUnicode=true&characterEncoding=utf-8&useSSL=false&serverTimezone=Asia/Shanghai
        hikari:
          max-lifetime: 120000
    
      jpa:
        show-sql: false
        database-platform: org.eclipse.persistence.platform.database.MySQLPlatform
        database: mysql
        properties:
          eclipselink:
            logging:
              level: SEVERE
    ```

   - `sureness.yml`修改是可选的，一般在你需要修改账号密码时

    ```yaml
    # account info config
    # eg: admin has role [admin,user], password is hertzbeat
    # eg: tom has role [user], password is hertzbeat
    # eg: lili has role [guest], plain password is lili, salt is 123, salted password is 1A676730B0C7F54654B0E09184448289
    account:
      - appId: admin
        credential: hertzbeat
        role: [admin]
      - appId: tom
        credential: hertzbeat
        role: [user]
      - appId: guest
        credential: hertzbeat
        role: [guest]
      - appId: lili
        # credential = MD5(password + salt)
        # plain password: hertzbeat
        # attention: digest authentication does not support salted encrypted password accounts
        credential: 94C6B34E7A199A9F9D4E1F208093B489
        salt: 123
        role: [user]
    ```

4. 添加相应的数据库驱动

由于apache基金会对于license合规的要求，HertzBeat的安装包不能包含mysql，oracle等gpl许可的依赖，需要用户自行添加，用户可通过以下链接自行下载驱动，复制到安装目录下`ext-lib`中。

mysql：[https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-8.0.25.zip](https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-8.0.18.zip)  
oracle（如果你要监控oracle，这两个驱动是必须的）：  
    [https://download.oracle.com/otn-pub/otn_software/jdbc/234/ojdbc8.jar](https://download.oracle.com/otn-pub/otn_software/jdbc/234/ojdbc8.jar)  
    [https://repo.mavenlibs.com/maven/com/oracle/database/nls/orai18n/21.5.0.0/orai18n-21.5.0.0.jar](https://repo.mavenlibs.com/maven/com/oracle/database/nls/orai18n/21.5.0.0/orai18n-21.5.0.0.jar?utm_source=mavenlibs.com)  
接下来，像之前那样运行启动脚本，即可体验最新的HertzBeat1.6.0！

### Docker 方式升级 - Mysql数据库

1. 关闭 HertzBeat 容器

    ```shell
    docker stop hertzbeat
    ```

2. 升级数据库脚本

    打开[https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager/src/main/resources/db/migration](https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager/src/main/resources/db/migration)，
    选择你使用的数据库的目录下相应的 `V160__update_column.sql`文件在 Mysql 执行升级sql。

3. 升级配置文件

    由于 `application.yml`和 `sureness.yml`更新变动较大，建议直接挂载使用新的yml配置文件，然后在自己的需求基础上进行修改。

   - `application.yml`一般需要修改以下部分

     默认为：

    ```yaml
      datasource:
        driver-class-name: com.mysql.cj.jdbc.Driver
        username: root
        password: root
        url: jdbc:mysql://localhost:3306/hertzbeat?useUnicode=true&characterEncoding=utf-8&useSSL=false&serverTimezone=Asia/Shanghai
        hikari:
          max-lifetime: 120000
    
      jpa:
        show-sql: false
        database-platform: org.eclipse.persistence.platform.database.MySQLPlatform
        database: mysql
        properties:
          eclipselink:
            logging:
              level: SEVERE
    ```

   - `sureness.yml`修改是可选的，一般在你需要修改账号密码时

    ```yaml
    # account info config
    # eg: admin has role [admin,user], password is hertzbeat
    # eg: tom has role [user], password is hertzbeat
    # eg: lili has role [guest], plain password is lili, salt is 123, salted password is 1A676730B0C7F54654B0E09184448289
    account:
      - appId: admin
        credential: hertzbeat
        role: [admin]
      - appId: tom
        credential: hertzbeat
        role: [user]
      - appId: guest
        credential: hertzbeat
        role: [guest]
      - appId: lili
        # credential = MD5(password + salt)
        # plain password: hertzbeat
        # attention: digest authentication does not support salted encrypted password accounts
        credential: 94C6B34E7A199A9F9D4E1F208093B489
        salt: 123
        role: [user]
    ```

4. 添加相应的数据库驱动

由于apache基金会对于license合规的要求，HertzBeat的安装包不能包含mysql，oracle等gpl许可的依赖，需要用户自行添加，用户可通过以下链接自行下载驱动 jar 放到本地 `ext-lib`目录下，然后启动时将`ext-lib`挂载到容器的 `/opt/hertzbeat/ext-lib`目录。

mysql：[https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-8.0.25.zip](https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-8.0.18.zip)  
oracle（如果你要监控oracle，这两个驱动是必须的）：  
    [https://download.oracle.com/otn-pub/otn_software/jdbc/234/ojdbc8.jar](https://download.oracle.com/otn-pub/otn_software/jdbc/234/ojdbc8.jar)  
    [https://repo.mavenlibs.com/maven/com/oracle/database/nls/orai18n/21.5.0.0/orai18n-21.5.0.0.jar](https://repo.mavenlibs.com/maven/com/oracle/database/nls/orai18n/21.5.0.0/orai18n-21.5.0.0.jar?utm_source=mavenlibs.com)  
接下来，像之前那样 Docker 运行启动 HertzBeat，即可体验最新的HertzBeat1.6.0！

### Docker安装升级 - H2内置数据库(生产环境不推荐使用H2)

1. 关闭 HertzBeat 容器

    ```shell
    docker stop hertzbeat
    ```

2. 编辑H2数据库文件

   前题你已经将 H2 数据库文件 data 目录挂载到本地，或者启动老容器手动将 /opt/hertzbeat/data 目录拷贝出来。
   下载 h2 驱动 jar [https://mvnrepository.com/artifact/com.h2database/h2/2.2.220](https://mvnrepository.com/artifact/com.h2database/h2/2.2.220)
   使用 h2 驱动 jar 本地启动数据库

    ```shell
    java -jar h2-2.2.220.jar -url jdbc:h2:file:./hertzbeat -user sa -password 123456
    ```

    打开[https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager/src/main/resources/db/migration](https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager/src/main/resources/db/migration)，
    选择你使用的数据库的目录下相应的 `V160__update_column.sql`文件在 H2 执行升级sql。

3. 升级配置文件

    由于 `application.yml`和 `sureness.yml`更新变动较大，建议直接挂载使用新的yml配置文件，然后在自己的需求基础上进行修改。

   - `application.yml`一般需要修改以下部分

     默认为：

    ```yaml
      datasource:
        driver-class-name: org.h2.Driver
        username: sa
        password: 123456
        url: jdbc:h2:./data/hertzbeat;MODE=MYSQL
        hikari:
          max-lifetime: 120000
    
      jpa:
        show-sql: false
        database-platform: org.eclipse.persistence.platform.database.MySQLPlatform
        database: h2
        properties:
          eclipselink:
            logging:
              level: SEVERE
    ```

   - `sureness.yml`修改是可选的，一般在你需要修改账号密码时

    ```yaml
    # account info config
    # eg: admin has role [admin,user], password is hertzbeat
    # eg: tom has role [user], password is hertzbeat
    # eg: lili has role [guest], plain password is lili, salt is 123, salted password is 1A676730B0C7F54654B0E09184448289
    account:
      - appId: admin
        credential: hertzbeat
        role: [admin]
      - appId: tom
        credential: hertzbeat
        role: [user]
      - appId: guest
        credential: hertzbeat
        role: [guest]
      - appId: lili
        # credential = MD5(password + salt)
        # plain password: hertzbeat
        # attention: digest authentication does not support salted encrypted password accounts
        credential: 94C6B34E7A199A9F9D4E1F208093B489
        salt: 123
        role: [user]
    ```

4. 添加相应的数据库驱动

由于apache基金会对于license合规的要求，HertzBeat的安装包不能包含mysql，oracle等gpl许可的依赖，需要用户自行添加，用户可通过以下链接自行下载驱动 jar 放到本地 `ext-lib`目录下，然后启动时将`ext-lib`挂载到容器的 `/opt/hertzbeat/ext-lib`目录。

mysql：[https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-8.0.25.zip](https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-8.0.18.zip)  
oracle（如果你要监控oracle，这两个驱动是必须的）：  
    [https://download.oracle.com/otn-pub/otn_software/jdbc/234/ojdbc8.jar](https://download.oracle.com/otn-pub/otn_software/jdbc/234/ojdbc8.jar)  
    [https://repo.mavenlibs.com/maven/com/oracle/database/nls/orai18n/21.5.0.0/orai18n-21.5.0.0.jar](https://repo.mavenlibs.com/maven/com/oracle/database/nls/orai18n/21.5.0.0/orai18n-21.5.0.0.jar?utm_source=mavenlibs.com)  
接下来，像之前那样 Docker 运行启动，即可体验最新的HertzBeat1.6.0！

### 通过导出导入升级

> 若不想如上繁琐的脚本升级方式，可以直接将老环境的监控任务和阈值信息导出导入

1. 部署一套最新版本的新环境
2. 在页面上将老环境的监控任务和阈值信息导出。
3. 在页面上将监控任务和阈值信息文件导入。

⚠️注意此方式只保留了老环境的监控任务信息和阈值信息，没有其它数据。
