/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.config;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.lang.reflect.Method;
import java.util.Map;
import org.apache.hertzbeat.warehouse.constants.WarehouseConstants;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.junit.jupiter.api.Test;

class OpenTelemetryConfigTest {

    @Test
    void greptimeLogExporterUsesNativeWarehouseLogTable() throws Exception {
        OpenTelemetryConfig config = new OpenTelemetryConfig();
        Method method = OpenTelemetryConfig.class.getDeclaredMethod(
                "buildGreptimeOtlpLogHeaders",
                GreptimeProperties.class
        );
        method.setAccessible(true);

        @SuppressWarnings("unchecked")
        Map<String, String> headers = (Map<String, String>) method.invoke(
                config,
                new GreptimeProperties(true, "127.0.0.1:4001", "http://127.0.0.1:4000",
                        "public", "greptime", "greptime", "1d")
        );

        assertEquals(WarehouseConstants.LOG_TABLE_NAME, headers.get("X-Greptime-Log-Table-Name"));
    }
}
