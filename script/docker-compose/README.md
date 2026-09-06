##  Docker-Compose Deploy

Suggest the [HertzBeat + GreptimeDB + Postgresql Solution](hertzbeat-postgresql-greptimedb) for the best performance and stability.

Notes:

- MySQL, MariaDB, OceanBase, and TiDB SQL query metrics can use the built-in MySQL-compatible query engine without `mysql-connector-j`.
- If you place `mysql-connector-j` in `ext-lib`, HertzBeat prefers JDBC after restart.
- Oracle and DB2 still require external JDBC driver jars in `ext-lib`.

## Listener scope for every quick-start variant

All five Docker Compose variants publish host ports on `127.0.0.1` by
default. This includes the HertzBeat listeners and the development database or
time-series database ports. Containers still communicate over their internal
`hertzbeat` network, so ordinary local use needs no override.

- `1157` (web/API) and `1158` (manager/collector transport) use
  `HERTZBEAT_BIND_ADDRESS`.
- `14317` (OTLP/gRPC ingestion) uses the independent
  `HERTZBEAT_OTLP_BIND_ADDRESS` override.
- Database and time-series database development ports remain loopback-only.

For a remote Collector, copy the selected variant's `.env.example` to `.env`
and set `HERTZBEAT_BIND_ADDRESS` to a reachable manager address. Expose `1158`
only to Collector source networks. Set `HERTZBEAT_OTLP_BIND_ADDRESS` separately
only for trusted OTLP senders. Before using `0.0.0.0`, replace bundled/default
credentials, apply firewall or security-group restrictions, and configure TLS.
Run `docker compose config` to inspect the final bindings before startup.


- Use Postgresql + GreptimeDB as HertzBeat dependent storage -> [HertzBeat+PostgreSQL+GreptimeDB Solution](hertzbeat-postgresql-greptimedb)
- Use Postgresql + VictoriaMetrics as HertzBeat dependent storage -> [HertzBeat+PostgreSQL+VictoriaMetrics Solution](hertzbeat-postgresql-victoria-metrics)
- Use Mysql + VictoriaMetrics as HertzBeat dependent storage -> [HertzBeat+Mysql+VictoriaMetrics Solution](hertzbeat-mysql-victoria-metrics)
- Use Mysql + IoTDB as HertzBeat dependent storage -> [HertzBeat+Mysql+IoTDB Solution](hertzbeat-mysql-iotdb)
- Use Mysql + Tdengine as HertzBeat dependent storage -> [HertzBeat+Mysql+Tdengine Solution](hertzbeat-mysql-tdengine)
