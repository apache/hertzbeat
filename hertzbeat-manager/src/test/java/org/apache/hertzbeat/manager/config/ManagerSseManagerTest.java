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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Test case for {@link ManagerSseManager}.
 *
 * <p>Every open subscription holds a request thread for as long as it lives, so both how
 * long one may live and how many may exist at once have to be bounded.
 */
class ManagerSseManagerTest {

    private ManagerSseManager managerSseManager;

    @BeforeEach
    void setUp() {
        managerSseManager = new ManagerSseManager();
    }

    @Test
    void testSubscriptionsAreGivenFiniteTimeout() {
        SseEmitter emitter = managerSseManager.createEmitter(1L);

        assertNotNull(emitter.getTimeout());
        assertTrue(emitter.getTimeout() > 0 && emitter.getTimeout() < Long.MAX_VALUE,
                "timeout must be finite, was " + emitter.getTimeout());
    }

    @Test
    void testSubscriptionsBeyondLimitAreRefused() {
        managerSseManager.setMaxEmitters(1);

        managerSseManager.createEmitter(1L);
        ResponseStatusException thrown =
                assertThrows(ResponseStatusException.class, () -> managerSseManager.createEmitter(2L));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, thrown.getStatusCode());
        assertEquals(1, managerSseManager.subscriptionCount());
    }
}
