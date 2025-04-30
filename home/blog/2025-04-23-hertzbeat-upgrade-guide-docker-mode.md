# HertzBeat 升级指导-(Docker Mode)

## Docker 方式升级 - Mysql 数据库

1. 数据备份

    - 备份数据库，将 mysql 数据手动做备份，按需备份

      ```bash
      mysqldump -h<HOST-IP> -P<PORT> -uroot -p"PASSWORD" <库名> hertzbeat_backup-`date +%Y-%m-%d`.sql #单库备份
      mysqldump -h<HOST-IP> -P<PORT> -uroot -p"PASSWORD" > hertzbeat_backup-`date +%Y-%m-%d`.sql # 整库备份
      ```

    - 备份配置文件及数据目录

      ```bash
      mv application.yml application-bak.yml && mv sureness-bak.yml
      cp -R data data-`date +%Y-%m-%d`. bak
      ```

2. 关闭 并移除 HertzBeat 容器

    ```shell
    docker stop hertzbeat && docker rm hertzbeat
    ```

3. 升级数据库脚本

    打开[https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager/src/main/resources/db/migration](https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager/src/main/resources/db/migration)， 选择你使用的数据库的目录下相应的 `V160__update_column.sql`文件在 Mysql 执行升级 sql。

4. 更换镜像重新启动 HertzBeat 容器

    ```bash
    $ docker run -d -p 1157:1157 -p 1158:1158 \
        -v $(pwd)/data:/opt/hertzbeat/data \
        -v $(pwd)/logs:/opt/hertzbeat/logs \
        -v $(pwd)/application.yml:/opt/hertzbeat/config/application.yml \
        -v $(pwd)/sureness.yml:/opt/hertzbeat/config/sureness.yml \
        --restart=always \
        --name hertzbeat apache/hertzbeat:v1.7.0
    ```

5. 升级配置文件

    参考备份配置根据自己的需求基础上进行修改。

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

6. 添加相应的数据库驱动

    由于 apache 基金会对于 license 合规的要求，HertzBeat 的安装包不能包含 mysql，oracle 等 gpl 许可的依赖，需要用户自行添加，用户可通过以下链接自行下载驱动 jar 放到本地 `ext-lib`目录下，然后启动时将`ext-lib`挂载到容器的 `/opt/hertzbeat/ext-lib`目录。

    mysql：[https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-8.0.25.zip](https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-8.0.18.zip)
    oracle（如果你要监控 oracle，这两个驱动是必须的）：
    [https://download.oracle.com/otn-pub/otn_software/jdbc/234/ojdbc8.jar](https://download.oracle.com/otn-pub/otn_software/jdbc/234/ojdbc8.jar)
    [https://repo.mavenlibs.com/maven/com/oracle/database/nls/orai18n/21.5.0.0/orai18n-21.5.0.0.jar](https://repo.mavenlibs.com/maven/com/oracle/database/nls/orai18n/21.5.0.0/orai18n-21.5.0.0.jar?utm_source=mavenlibs.com)
