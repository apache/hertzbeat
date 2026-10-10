---
name: mysql-slow-query-diagnosis
description: Diagnose slow queries, active sessions, locks, and query plans for a monitored MySQL or MariaDB instance. Use when database latency or query performance is under investigation.
---
<!--
  Licensed to the Apache Software Foundation (ASF) under one or more
  contributor license agreements. See the NOTICE file distributed with
  this work for additional information regarding copyright ownership.
  The ASF licenses this file to You under the Apache License, Version 2.0.
-->
# MySQL Slow Query Diagnosis

1. Resolve the exact monitor and confirm it is a MySQL or MariaDB monitor.
2. Use `database.mysql_slow_queries` to identify expensive query patterns.
3. Use `database.mysql_process_list` to inspect currently active work.
4. Use `database.mysql_lock_waits` when concurrency or blocking may be involved.
5. Use `database.mysql_global_status` with a focused pattern for relevant server counters.
6. Use `database.explain_query` only when the user supplied a concrete SELECT statement that needs plan analysis.
7. Correlate the observations before recommending indexes, SQL changes, or server tuning.
8. Separate evidence, inference, and recommendations in the final Markdown report.

Never request database credentials. Use only credentials already configured on the HertzBeat monitor.
