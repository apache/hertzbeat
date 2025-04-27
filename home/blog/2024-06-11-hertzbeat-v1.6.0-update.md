# HertzBeat 1.6.0 Upgrade Guide

**Note: This guide is applicable for upgrading from 1.5.0 to 1.6.0 to version 1.6.0.**
**If you are using an older version, it is recommended to reinstall using the export function, or upgrade to 1.5.0 and then follow this guide to 1.6.0.**

## Binary Installation Package Upgrade

### Upgrade Java Environment

Since version 1.6.0 uses Java 17 and the installation package no longer provides a built-in JDK version, use the new Hertzbeat according to the following situations:

- When the default environment variable on your server is Java 17, you do not need to take any action for this step.
- When the default environment variable on your server is not Java 17, such as Java 8 or Java 11, and if there are no other applications on your server that require a lower version of Java, download the appropriate version from [https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html](https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html) according to your system, and search the engine for how to set a new environment variable pointing to the new Java 17.
- When the default environment variable on your server is not Java 17, such as Java 8 or Java 11, and if there are other applications on your server that require a lower version of Java, download the appropriate version from [https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html](https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html) according to your system, and rename the extracted folder to `java`, then copy it to the Hertzbeat extraction directory.

### Upgrade Database

Go to [https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager/src/main/resources/db/migration](https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager/src/main/resources/db/migration), choose the directory of your database and execute the corresponding `V160__update_column.sql` file for the upgrade SQL.

### Upgrade Configuration Files

Due to significant changes in `application.yml` and `sureness.yml`, it is recommended to directly use the new `yml` configuration files and then modify them based on your own needs.

#### `application.yml` generally needs to modify the following parts

Default is:

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

If you change to a MySQL database, here is an example:

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

#### `sureness.yml` modification is optional, usually when you need to change account passwords

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

### Add the corresponding database drivers

Due to the Apache Foundation's requirements for license compliance, HertzBeat's installation package cannot include dependencies with GPL licenses such as MySQL, Oracle, etc. Users need to add them themselves. Users can download the drivers from the following links and copy them to the `ext-lib` directory of the installation:

- MySQL: [https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-8.0.25.zip](https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-8.0.25.zip)
- Oracle (If you want to monitor Oracle, these two drivers are required):
  - [https://repo1.maven.org/maven2/com/oracle/database/jdbc/ojdbc8/23.4.0.24.05/ojdbc8-23.4.0.24.05.jar](https://repo1.maven.org/maven2/com/oracle/database/jdbc/ojdbc8/23.4.0.24.05/ojdbc8-23.4.0.24.05.jar)
  - [https://repo.mavenlibs.com/maven/com/oracle/database/nls/orai18n/21.5.0.0/orai18n-21.5.0.0.jar](https://repo.mavenlibs.com/maven/com/oracle/database/nls/orai18n/21.5.0.0/orai18n-21.5.0.0.jar)

Next, run the start-up script as before to experience the latest HertzBeat 1.6.0!

## Docker Upgrade - Mysql Database

- Stop the HertzBeat container:

  ```shell
  docker stop hertzbeat
  ```

- Upgrade the database script:
  - Go to [https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager/src/main/resources/db/migration](https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager/src/main/resources/db/migration), choose the directory of your database and execute the corresponding `V160__update_column.sql` file in MySQL.
- Upgrade the configuration files:
  - As mentioned, due to significant changes in `application.yml` and `sureness.yml`, it is recommended to directly mount and use the new `yml` configuration files, and then modify them based on your own needs.
- Add the corresponding database drivers:
  - Due to the Apache Foundation's license compliance requirements, HertzBeat's installation package cannot include MySQL, Oracle, and other GPL-licensed dependencies. Users need to add them themselves by downloading the driver jars from the above links and placing them in the local `ext-lib` directory, then mounting `ext-lib` to the container's `/opt/hertzbeat/ext-lib` directory when starting.

Next, run HertzBeat using Docker as before to experience the latest HertzBeat 1.6.0!

## Docker Installation Upgrade - H2 Built-in Database (Not recommended for production use)

- Stop the HertzBeat container:

  ```shell
  docker stop hertzbeat
  ```

- Edit the H2 database files:
  - Assuming you have mounted the H2 database files in the `data` directory to the local system, or copied the `/opt/hertzbeat/data` directory from the old container manually.
  - Download the H2 driver jar from [https://mvnrepository.com/artifact/com.h2database/h2/2.2.220](https://mvnrepository.com/artifact/com.h2database/h2/2.2.220).
  - Start the database locally using the H2 driver jar:

    ```shell
    java -jar h2-2.2.220.jar -url jdbc:h2:file:./hertzbeat -user sa -password 123456
    ```

- Upgrade the configuration files:
  - As mentioned, due to significant changes in `application.yml` and `sureness.yml`, it is recommended to directly mount and use the new `yml` configuration files, and then modify them based on your own needs.
- Add the corresponding database drivers:
  - As mentioned, due to the Apache Foundation's license compliance requirements, HertzBeat's installation package cannot include MySQL, Oracle, and other GPL-licensed dependencies. Users need to add them themselves by downloading the driver jars from the above links and placing them in the local `ext-lib` directory, then mounting `ext-lib` to the container's `/opt/hertzbeat/ext-lib` directory when starting.

Next, run the Docker to start HertzBeat as before to experience the latest HertzBeat 1.6.0!

## Upgrade via Export and Import

If you do not want to go through the tedious script upgrade method mentioned above, you can directly export and import the monitoring tasks and threshold information from the old environment.

- Deploy a new environment with the latest version.
- Export the monitoring tasks and threshold information from the old environment on the page
