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

package org.apache.hertzbeat.common.entity.job;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

class InlineCollectionPermitTest {
    private InlineCollectionPermit permit(AtomicBoolean allowed, long expires) {
        return new InlineCollectionPermit(
                List.of("bash", "-c", "printf fixture"),
                "/tmp",
                System.getProperty("user.name"),
                System.getProperty("os.name"),
                expires,
                Clock.fixed(Instant.ofEpochMilli(10), ZoneOffset.UTC),
                allowed::get);
    }

    @Test
    void exactInvocationIsConsumedOnce() {
        var p = permit(new AtomicBoolean(true), 100);
        p.consume(List.of("bash", "-c", "printf fixture"), "/tmp");
        assertTrue(p.consumed());
        assertThrows(
                IllegalStateException.class,
                () -> p.consume(List.of("bash", "-c", "printf fixture"), "/tmp"));
    }

    @Test
    void modifiedCommandDirectoryCancellationAndExpiryFailClosed() {
        var allowed = new AtomicBoolean(true);
        var p = permit(allowed, 100);
        assertThrows(
                IllegalStateException.class,
                () -> p.consume(List.of("bash", "-c", "printf changed"), "/tmp"));
        assertThrows(
                IllegalStateException.class,
                () -> p.consume(List.of("bash", "-c", "printf fixture"), "/"));
        allowed.set(false);
        assertThrows(
                IllegalStateException.class,
                () -> p.consume(List.of("bash", "-c", "printf fixture"), "/tmp"));
        assertFalse(p.consumed());
        var expired = permit(new AtomicBoolean(true), 10);
        assertThrows(
                IllegalStateException.class,
                () -> expired.consume(List.of("bash", "-c", "printf fixture"), "/tmp"));
    }

    @Test
    void permitIsNotSerializedIntoNativeOrClusterJobs() {
        var m = Metrics.builder().build();
        InlineCollectionPermit.bind(m, permit(new AtomicBoolean(true), 100));
        String json = org.apache.hertzbeat.common.util.JsonUtil.toJson(m);
        assertFalse(json.contains("inlineCollectionPermit"));
        assertNull(
                InlineCollectionPermit.find(
                        org.apache.hertzbeat.common.util.JsonUtil.fromJson(json, Metrics.class)));
    }

    @Test
    void changingMutableMetricFieldsCannotLoseTheBoundCapability() {
        var m = Metrics.builder().name("before").build();
        var p = permit(new AtomicBoolean(true), 100);
        InlineCollectionPermit.bind(m, p);
        m.setName("after");
        m.setInterval(0);
        assertTrue(InlineCollectionPermit.find(m) == p);
    }
}
