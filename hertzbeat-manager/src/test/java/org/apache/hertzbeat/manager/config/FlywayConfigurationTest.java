/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.config;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.CoreErrorCode;
import org.flywaydb.core.api.ErrorDetails;
import org.flywaydb.core.api.exception.FlywayValidateException;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.mockito.Mockito;
import org.springframework.boot.flyway.autoconfigure.FlywayProperties;

/**
 * Test case for {@link FlywayConfiguration}
 */
class FlywayConfigurationTest {

    private final Flyway flyway = Mockito.mock(Flyway.class);
    private final FlywayConfiguration configuration = new FlywayConfiguration();

    private FlywayProperties enabledProperties() {
        FlywayProperties properties = new FlywayProperties();
        properties.setEnabled(true);
        return properties;
    }

    private static FlywayValidateException validateException(String message) {
        return new FlywayValidateException(new ErrorDetails(CoreErrorCode.VALIDATE_ERROR, message), message);
    }

    @Test
    void repairsAndRetriesWhenHistoryHasFailedMigration() {
        Mockito.when(flyway.migrate())
                .thenThrow(validateException("Detected failed migration to version 181 (update column)"))
                .thenReturn(null);

        configuration.delayedFlywayInitializer(flyway, enabledProperties());

        InOrder inOrder = Mockito.inOrder(flyway);
        inOrder.verify(flyway).migrate();
        inOrder.verify(flyway).repair();
        inOrder.verify(flyway).migrate();
    }

    @Test
    void rethrowsOtherValidationErrorsWithoutRepair() {
        Mockito.when(flyway.migrate())
                .thenThrow(validateException("Migration checksum mismatch for migration version 180"));

        Assertions.assertThrows(FlywayValidateException.class,
                () -> configuration.delayedFlywayInitializer(flyway, enabledProperties()));
        Mockito.verify(flyway, Mockito.never()).repair();
    }
}
