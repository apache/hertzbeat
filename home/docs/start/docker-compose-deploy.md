---
id: docker-compose-deploy
title: Install HertzBeat via Docker Compose 
sidebar_label: Install via Docker Compose
---

:::tip
Suggest to use Docker Compose to deploy HertzBeat and its dependent services.
:::

:::note
This document assumes that you already have Docker and Docker Compose installed in your environment. If not, please refer to the [Docker official documentation](https://docs.docker.com/compose/install/).
Run the `docker compose version` command to check if you have a Docker Compose environment.
:::

1. Download the startup script package

   Download the installation script package `apache-hertzbeat-xxx-incubating-docker-compose.tar.gz` from the [download](/docs/download)

2. Choose to use the HertzBeat + PostgreSQL + VictoriaMetrics solution

   :::tip

   - `apache-hertzbeat-xxx-incubating-docker-compose.tar.gz` contains multiple deployment solutions after decompression. Here we recommend choosing the `hertzbeat-postgresql-victoria-metrics` solution.
   - Other deployment methods, please read the README.md file of each deployment solution in detail. The MySQL solution requires you to prepare the MySQL driver package yourself.

   :::

   - Unzip the script package

   ```shell
   tar zxvf apache-hertzbeat-1.6.0-incubating-docker-compose.tar.gz
   ```

   - Enter the decompression directory and select `HertzBeat + PostgreSQL + VictoriaMetrics` for one-click deployment

   ```shell
   cd apache-hertzbeat-1.6.0-incubating-docker-compose    
   cd hertzbeat-postgresql-victoria-metrics
   ```

   - One-click start

   > Run script in `hertzbeat-postgresql-victoria-metrics` directory

   ```shell
   docker-compose up -d
   ```

   - View service status

      > View the running status of each container, up is the normal running status

      ```shell
      docker-compose ps
      ```

3. Start exploring HertzBeat
   Access <http://ip:1157/> in the browser to start exploring and using it. The default account password is admin/hertzbeat.

**HAVE FUN**

----

### FAQ

**The most common problem is network problems, please check in advance**
