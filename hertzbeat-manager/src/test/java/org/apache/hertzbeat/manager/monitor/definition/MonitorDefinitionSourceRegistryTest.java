/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.monitor.definition;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import org.apache.hertzbeat.common.entity.job.Job;
import org.junit.jupiter.api.Test;

class MonitorDefinitionSourceRegistryTest {

    @Test
    void failedRebuildRetainsPublishedAndMutableRegistryState() {
        MonitorDefinitionSourceRegistry registry = new MonitorDefinitionSourceRegistry();
        registry.registerActive(job("previous"), "app: previous");

        assertThrows(IllegalStateException.class, () -> registry.rebuild(() -> {
            registry.registerActive(job("partial"), "app: partial");
            throw new IllegalStateException("load failed");
        }));
        registry.registerActive(job("next"), "app: next");

        assertEquals(List.of("next", "previous"), registry.readAll().stream()
                .map(source -> source.job().getApp())
                .sorted()
                .toList());
    }

    private static Job job(String app) {
        Job job = new Job();
        job.setApp(app);
        return job;
    }
}
