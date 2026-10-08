-- Licensed to the Apache Software Foundation (ASF) under one or more
-- contributor license agreements. See the NOTICE file distributed with
-- this work for additional information regarding copyright ownership.
-- The ASF licenses this file to You under the Apache License, Version 2.0.
--
-- Current V200 schema baseline for provisioning an empty embedded H2 store.
-- H2 runs in MySQL compatibility mode, so keep the shared current-schema
-- definition executable rather than maintaining a third divergent snapshot.
-- Shared MySQL baseline SHA-256: e1ac255c10a573b5530ec1c14c7765bbb14473090bf8c08322fe935c5b169669

RUNSCRIPT FROM 'classpath:db/migration/mysql/B200__current_schema.sql';
