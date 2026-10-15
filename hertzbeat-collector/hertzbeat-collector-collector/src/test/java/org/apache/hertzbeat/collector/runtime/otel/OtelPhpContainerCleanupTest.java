/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to you under the Apache License, Version 2.0
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

package org.apache.hertzbeat.collector.runtime.otel;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.IOException;
import org.junit.jupiter.api.Test;

class OtelPhpContainerCleanupTest {

    private static final String CONTAINER_NAME =
            "hertzbeat-php-zero-code-6ce96e52-2df4-47b7-a9c7-72d9069edab2";

    @Test
    void ignoresRemovalFailureOnlyWhenContainerIsConfirmedAbsent() {
        assertDoesNotThrow(() -> OtelPhpZeroCodeIntegrationTest.verifyContainerRemoved(
                CONTAINER_NAME,
                () -> {
                    throw new IOException("remove failed");
                },
                () -> false));
    }

    @Test
    void surfacesRemovalFailureWhenContainerStillExists() {
        IOException removalFailure = new IOException("remove failed");

        IllegalStateException failure = assertThrows(
                IllegalStateException.class,
                () -> OtelPhpZeroCodeIntegrationTest.verifyContainerRemoved(
                        CONTAINER_NAME,
                        () -> {
                            throw removalFailure;
                        },
                        () -> true));

        assertEquals(1, failure.getSuppressed().length);
        assertSame(removalFailure, failure.getSuppressed()[0]);
    }

    @Test
    void surfacesAbsenceCheckFailureAndRetainsRemovalFailure() {
        IOException removalFailure = new IOException("remove failed");
        IOException statusFailure = new IOException("daemon unavailable");

        IOException failure = assertThrows(
                IOException.class,
                () -> OtelPhpZeroCodeIntegrationTest.verifyContainerRemoved(
                        CONTAINER_NAME,
                        () -> {
                            throw removalFailure;
                        },
                        () -> {
                            throw statusFailure;
                        }));

        assertSame(statusFailure, failure);
        assertEquals(1, failure.getSuppressed().length);
        assertSame(removalFailure, failure.getSuppressed()[0]);
    }
}
