# HertzBeat Upgrade Guide (Docker Mode)

## Docker-based Upgrade

### 1. Data Backup

- **Back up the database**: Manually back up MySQL data as needed.

  ```bash
  mysqldump -h<HOST-IP> -P<PORT> -uroot -p"PASSWORD" <DB_NAME> > hertzbeat_backup-`date +%Y-%m-%d`.sql  # Single database  
  mysqldump -h<HOST-IP> -P<PORT> -uroot -p"PASSWORD" --all-databases > hertzbeat_backup-`date +%Y-%m-%d`.sql  # Full database  
  ```

- **Back up configuration files and data directory**:

  ```bash
  mv application.yml application-bak.yml && mv sureness.yml sureness-bak.yml  
  cp -R data data-`date +%Y-%m-%d`.bak  
  ```

### 2. Stop and Remove the HertzBeat Container

```bash
docker stop hertzbeat && docker rm hertzbeat  
```

### 3. Upgrade Database Schema

Navigate to [HertzBeat GitHub Migration Scripts](https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager/src/main/resources/db/migration), select the appropriate `V160__update_column.sql` file under your database type (e.g., MySQL), and execute it in MySQL.

### 4. Restart HertzBeat with the New Image

```bash
docker run -d -p 1157:1157 -p 1158:1158 \  
    -v $(pwd)/data:/opt/hertzbeat/data \  
    -v $(pwd)/logs:/opt/hertzbeat/logs \  
    -v $(pwd)/application.yml:/opt/hertzbeat/config/application.yml \  
    -v $(pwd)/sureness.yml:/opt/hertzbeat/config/sureness.yml \  
    --restart=always \  
    --name hertzbeat apache/hertzbeat:v1.7.0  
```

### 5. Update Configuration Files

Modify the backup configurations as needed:

- **`application.yml`** (Typical modifications):

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

- **`sureness.yml`** (Optional, modify for account/password changes):

  ```yaml
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
      credential: 94C6B34E7A199A9F9D4E1F208093B489
      salt: 123
      role: [user]
  ```

### 6. Add Database Drivers

Due to Apache Foundation’s license compliance requirements, HertzBeat cannot include GPL-licensed dependencies (e.g., MySQL, Oracle). Users must manually download drivers and place them in the `ext-lib` directory, then mount it to `/opt/hertzbeat/ext-lib`:

- **MySQL Driver**: [Download MySQL Connector/J 8.0.25](https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-8.0.25.zip)
- **Oracle Driver** (Required for Oracle monitoring):
  - [ojdbc8.jar](https://download.oracle.com/otn-pub/otn_software/jdbc/234/ojdbc8.jar)
  - [orai18n-21.5.0.0.jar](https://repo.mavenlibs.com/maven/com/oracle/database/nls/orai18n/21.5.0.0/orai18n-21.5.0.0.jar)
