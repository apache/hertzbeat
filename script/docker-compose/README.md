##  Docker-Compose Deploy

Suggest the [HertzBeat + GreptimeDB + Postgresql Solution](hertzbeat-postgresql-greptimedb) for the best performance and stability.

Notes:

- MySQL, MariaDB, OceanBase, and TiDB SQL query metrics can use the built-in MySQL-compatible query engine without `mysql-connector-j`.
- If you place `mysql-connector-j` in `ext-lib`, HertzBeat prefers JDBC after restart.
- Oracle and DB2 still require external JDBC driver jars in `ext-lib`.

- Use Postgresql + GreptimeDB as Hertzbeat dependent storage -> [HertzBeat+PostgreSQL+GreptimeDB Solution](hertzbeat-postgresql-greptimedb)
- Use Postgresql + VictoriaMetrics as Hertzbeat dependent storage -> [HertzBeat+PostgreSQL+VictoriaMetrics Solution](hertzbeat-postgresql-victoria-metrics)
- Use Mysql + VictoriaMetrics as Hertzbeat dependent storage -> [HertzBeat+Mysql+VictoriaMetrics Solution](hertzbeat-mysql-victoria-metrics)
- Use Mysql + IoTDB as Hertzbeat dependent storage -> [HertzBeat+Mysql+IoTDB Solution](hertzbeat-mysql-iotdb)
- Use Mysql + Tdengine as Hertzbeat dependent storage -> [HertzBeat+Mysql+Tdengine Solution](hertzbeat-mysql-tdengine)
