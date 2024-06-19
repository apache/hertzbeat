## docker-compose deployment HertzBeat+PostgreSQL+IoTDB solution

> The docker-compose deployment scheme uses PostgreSQL + VictoriaMetrics as the dependent storage service of Hertzbeat.  
> This solution will start three container services PostgreSQL, VictoriaMetrics, HertzBeat

##### Install Docker & Docker-compose

1. Download and install docker environment & docker-compose environment
   Please refer to [Docker official website documentation](https://docs.docker.com/get-docker/), [Compose installation](https://docs.docker.com/compose/install/)
    ```
    $ docker -v
    Docker version 20.10.12, build e91ed57
    ```

##### docker compose deploys hertzbeat and its dependent services

1. Download the hertzbeat-docker-compose installation deployment script file
   The script file is located in `script/docker-compose/hertzbeat-postgresql-victoria-metrics` link [script/docker-compose](https://github.com/apache/hertzbeat/tree/master/script/docker-compose/hertzbeat-postgresql-victoria-metrics)


2. Enter the deployment script docker-compose directory, execute

   `docker compose up -d`


##### Start exploring HertzBeat

Browser access `localhost:1157` to start, the default account password `admin/hertzbeat`
