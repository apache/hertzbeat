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

package org.apache.hertzbeat.common.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.common.concurrent.AdmissionMode;
import org.junit.jupiter.api.Test;

class VirtualThreadPropertiesTest {

    @Test
    void defaultsRemainSafeWithoutExternalConfiguration() {
        VirtualThreadProperties properties = VirtualThreadProperties.defaults();

        assertTrue(properties.isEnabled());

        assertEquals(AdmissionMode.LIMIT_AND_REJECT, properties.getCollector().getMode());
        assertTrue(properties.getCollector().getMaxConcurrentJobs() >= 1);

        assertEquals(AdmissionMode.UNBOUNDED_VT, properties.getCommon().getMode());
        assertEquals(AdmissionMode.LIMIT_AND_REJECT, properties.getManager().getMode());
        assertEquals(10, properties.getManager().getMaxConcurrentJobs());

        assertEquals(AdmissionMode.LIMIT_AND_REJECT, properties.getAlerter().getNotify().getMode());
        assertEquals(64, properties.getAlerter().getNotify().getMaxConcurrentJobs());
        assertEquals(10, properties.getAlerter().getPeriodicMaxConcurrentJobs());
        assertEquals(10, properties.getAlerter().getLogWorker().getMaxConcurrentJobs());
        assertEquals(1000, properties.getAlerter().getLogWorker().getQueueCapacity());
        assertEquals(2, properties.getAlerter().getReduce().getMaxConcurrentJobs());
        assertEquals(0, properties.getAlerter().getReduce().getQueueCapacity());
        assertEquals(2, properties.getAlerter().getWindowEvaluator().getMaxConcurrentJobs());
        assertEquals(0, properties.getAlerter().getWindowEvaluator().getQueueCapacity());
        assertEquals(4, properties.getAlerter().getNotifyMaxConcurrentPerChannel());

        assertEquals(AdmissionMode.UNBOUNDED_VT, properties.getWarehouse().getMode());

        assertTrue(properties.getAsync().isEnabled());
        assertEquals(256, properties.getAsync().getConcurrencyLimit());
        assertTrue(properties.getAsync().isRejectWhenLimitReached());
        assertEquals(5000L, properties.getAsync().getTaskTerminationTimeout());
    }
}
