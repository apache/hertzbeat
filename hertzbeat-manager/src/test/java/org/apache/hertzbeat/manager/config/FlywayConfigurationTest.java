/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.config;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

class FlywayConfigurationTest {

    @Test
    void migratesBeforeJpaInsteadOfWaitingForHibernateSchemaMutation() throws Exception {
        Flyway flyway = mock(Flyway.class);

        new FlywayConfiguration().flywayInitializer(flyway).afterPropertiesSet();

        verify(flyway).migrate();
    }
}
