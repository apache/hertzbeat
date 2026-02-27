## Docker-Compose deployment HertzBeat+Mysql+Tdengine Solution

> The docker-compose deployment scheme uses Mysql + Tdengine as the dependent storage service of Hertzbeat.
> This solution will start three container services Mysql, Tdengine, HertzBeat

##### Install Docker & Docker-compose

1. Download and install docker environment & docker-compose environment
   Please refer to [Docker official website documentation](https://docs.docker.com/get-docker/), [Compose installation](https://docs.docker.com/compose/install/)
    ```
    $ docker -v
    Docker version 20.10.12, build e91ed57
    ```

##### docker compose deploys hertzbeat and its dependent services

1. Download the hertzbeat-docker-compose installation deployment script file
   The script file is located in `script/docker-compose/hertzbeat-mysql-tdengine` link [script/docker-compose](https://github.com/apache/hertzbeat/tree/master/script/docker-compose/hertzbeat-mysql-tdengine)

2. Add MYSQL jdbc driver jar

   Download the MYSQL jdbc driver jar package, such as mysql-connector-java-8.0.25.jar. https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-8.0.25.zip
   Copy the jar package to the ext-lib directory.

3. Enter the deployment script docker-compose directory, execute

   `docker compose up -d`

4. Enter tdengine to create hertzbeat database

   ```shell
   $ docker exec -it tdengine /bin/bash
   root@tdengine-server:~/TDengine-server-2.4.0.4#
   ```

   Create a database named hertzbeat After entering the container, execute the taos shell client program.
   
   ```bash
   root@tdengine-server:~/TDengine-server-2.4.0.4# taos
   Welcome to the TDengine shell from Linux, Client Version: 2.4.0.4
   Copyright (c) 2020 by TAOS Data, Inc. All rights reserved.
   taos>
   ```

   
   
   Execute the create database command
   
   `taos> show databases;`

   `taos> CREATE DATABASE hertzbeat KEEP 90 DURATION 10 BUFFER 16;`

##### Restart the application

`docker-compose restart hertzbeat`

##### Start exploring HertzBeat

Browser access `localhost:1157` to start, the default account password `admin/hertzbeat`
