## docker-compose deployment HertzBeat+PostgreSQL+GreptimeDB solution

> The docker-compose deployment scheme uses PostgreSQL + GreptimeDB as the dependent storage service of HertzBeat.  
> This solution will start three container services PostgreSQL, GreptimeDB, HertzBeat

##### Install Docker & Docker-compose

1. Download and install docker environment & docker-compose environment
   Please refer to [Docker official website documentation](https://docs.docker.com/get-docker/), [Compose installation](https://docs.docker.com/compose/install/)
    ```
    $ docker -v
    Docker version 20.10.12, build e91ed57
    ```

##### Docker Compose deploys HertzBeat and its dependent services

1. Download the hertzbeat-docker-compose installation deployment script file
   The script file is located in `script/docker-compose/hertzbeat-postgresql-greptimedb` link [script/docker-compose](https://github.com/apache/hertzbeat/tree/master/script/docker-compose/hertzbeat-postgresql-greptimedb)


2. Optional: add external JDBC driver jars to `ext-lib`

   MySQL-compatible monitoring can use the built-in query engine directly, so `mysql-connector-j` is optional.
   If you want HertzBeat to prefer JDBC after restart, place `mysql-connector-j` in `ext-lib`.
   Oracle and DB2 still require external JDBC jars in `ext-lib`.

3. Enter the deployment script Docker Compose directory and execute:

   `docker compose up -d`

##### Listener scope and remote collectors

The quick-start stack publishes every host port on `127.0.0.1` by default:

- `1157` is the HertzBeat web UI and API.
- `1158` is the manager/collector transport.
- `15432` and `14000`–`14003` are the PostgreSQL and GreptimeDB development
  endpoints. They remain loopback-only because containers use the internal
  `hertzbeat` network.

No configuration change is needed for ordinary local use. To connect a
collector from another host, copy `.env.example` to `.env` and set
`HERTZBEAT_BIND_ADDRESS` to an address that the collector can reach:

```shell
cp .env.example .env
# Edit HERTZBEAT_BIND_ADDRESS, then render and inspect the final mappings.
docker compose config
```

Expose `1158` only to the collector source networks. If remote browser/API
access is also needed, expose `1157` through a TLS reverse proxy where
possible. Before setting a wildcard address such as `0.0.0.0`, replace all
bundled/default credentials, restrict access with a firewall or security
group, and configure TLS. `HERTZBEAT_BIND_ADDRESS` does not expose the
PostgreSQL or GreptimeDB ports.

Configure a remote collector with the manager's reachable address and port
`1158`; do not point it at `127.0.0.1` unless the manager runs on the same
host.

##### Start exploring HertzBeat

Browser access `localhost:1157` to start, the default account password `admin/hertzbeat`
