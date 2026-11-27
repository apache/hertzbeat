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

   Download the installation script package `apache-hertzbeat-xxx-docker-compose.tar.gz` from the [download](/docs/download)

2. Choose to use the HertzBeat + PostgreSQL + VictoriaMetrics solution

   :::tip

   - `apache-hertzbeat-${version}-docker-compose.tar.gz` contains multiple deployment solutions after decompression. Here we recommend choosing the `hertzbeat-postgresql-victoria-metrics` solution.
   - Other deployment methods, please read the README.md file of each deployment solution in detail. The MySQL solution requires you to prepare the MySQL driver package yourself.

   :::

   - Unzip the script package

   ```shell
   tar zxvf apache-hertzbeat-${version}-docker-compose.tar.gz
   ```

   - Enter the decompression directory and select `HertzBeat + PostgreSQL + VictoriaMetrics` for one-click deployment

   ```shell
   cd apache-hertzbeat-${version}-docker-compose
   cd hertzbeat-postgresql-victoria-metrics
   ```

   - Create the `.env` file and set the database password

   > `POSTGRES_PASSWORD` is required. `docker compose up` refuses to start without it.

   ```shell
   cp .env.example .env
   # Edit .env and set POSTGRES_PASSWORD to a strong password of your own
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
   Access [http://localhost:1157/](http://localhost:1157/) in the browser to start exploring and using it. The default account password is admin/hertzbeat.

   :::note

   The quick-start stack publishes every host port on `127.0.0.1` by default, so the web UI is reachable only from the machine running Docker. To open it to other hosts, set `HERTZBEAT_BIND_ADDRESS` in `.env` to an address those hosts can reach (a TLS reverse proxy is preferred over a wildcard address such as `0.0.0.0`), then run `docker compose config` to inspect the final port bindings and restart with `docker compose up -d`.

   This setting also opens `1158` for remote Collectors; `14317` (OTLP/gRPC) is controlled separately by `HERTZBEAT_OTLP_BIND_ADDRESS`. See the `README.md` of the deployment solution for details.

   :::

**HAVE FUN**

----

## FAQ

**The most common problem is network problems, please check in advance**

### The browser repeatedly asks for a username and password

The original HertzBeat 1.9.0 Compose configuration enables HTTP Digest authentication. When a protected API responds with `401 Unauthorized` and a `WWW-Authenticate: Digest` header, the browser can open its own sign-in dialog.

In your deployment directory, open `conf/application.yml` on the Docker host and remove only `- digest` under `sureness.auths`. Keep `basic` and `jwt` enabled. Run the following command from the same directory to apply the change.

```shell
docker compose restart hertzbeat
```

### The browser shows a certificate warning

On the Docker host, open `http://localhost:1157/`. For remote access, use HTTPS through a reverse proxy with a certificate that the browser trusts and that matches the hostname in the URL.
