-- Licensed to the Apache Software Foundation (ASF) under one or more
-- contributor license agreements. See the NOTICE file distributed with
-- this work for additional information regarding copyright ownership.
-- The ASF licenses this file to You under the Apache License, Version 2.0.
--
-- Current V200 schema baseline for provisioning an empty embedded H2 store.
-- H2 runs in MySQL compatibility mode, so keep the shared current-schema
-- definition executable rather than maintaining a third divergent snapshot.
-- Shared MySQL baseline SHA-256: ba50b35f45bad81ace0d19c2077430107e4eb9753570075a59479a23378ec771

RUNSCRIPT FROM 'classpath:db/migration/mysql/B200__current_schema.sql';
