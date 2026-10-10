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

package org.apache.hertzbeat.observability.shared.query;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class TelemetryQueryContextScopeTest {

    @Test
    void acceptsCommonFrameworkRouteTemplates() {
        assertEquals("http.route=\"my-controller/my-action/{id?}\"",
                new TelemetryQueryContextScope(null, "my-controller/my-action/{id?}")
                        .applyAttributeFilter(null));
        assertEquals("http_route=\"/users/:userID?\"",
                new TelemetryQueryContextScope(null, "/users/:userID?").applyMetricFilter(null));
    }

    @Test
    void rejectsMethodConcreteUrlQueryStringAndFragment() {
        ObservabilityQueryRequestException failure = assertThrows(
                ObservabilityQueryRequestException.class,
                () -> new TelemetryQueryContextScope(null, "POST /checkout"));
        assertEquals(ObservabilityQueryRequestException.ERROR_CODE, failure.getMessage());
        assertThrows(IllegalArgumentException.class,
                () -> new TelemetryQueryContextScope(null, "https://example.com/checkout"));
        assertThrows(IllegalArgumentException.class,
                () -> new TelemetryQueryContextScope(null, "/checkout?order=42"));
        assertThrows(IllegalArgumentException.class,
                () -> new TelemetryQueryContextScope(null, "/checkout#details"));
    }

    @Test
    void detectsDedicatedKeysWithoutMatchingValuesOrLongerKeys() {
        TelemetryQueryContextScope scope = new TelemetryQueryContextScope("checkout-7d9", null);

        assertEquals("description=\"service_instance_id and other\""
                        + " and service_instance_id=\"checkout-7d9\"",
                scope.applyMetricFilter("description=\"service_instance_id and other\""));
        assertEquals("service_instance_id_suffix=other and service_instance_id=\"checkout-7d9\"",
                scope.applyMetricFilter("service_instance_id_suffix=other"));
        assertThrows(IllegalArgumentException.class,
                () -> scope.applyMetricFilter("description=other and service_instance_id in (a, b)"));
    }
}
