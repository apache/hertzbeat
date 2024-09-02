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

package org.apache.hertzbeat.warehouse.constants;

/**
 * Warehouse configuration constants.
 */

public interface WarehouseConstants {

    String STORE = "store";

    String REAL_TIME = "real-time";

    /**
     * History database name.
     */
    interface HistoryName {
        String GREPTIME = "greptime";

        String INFLUXDB = "influxdb";

        String IOT_DB = "iot-db";

        String JPA = "jpa";

        String TD_ENGINE = "td-engine";

        String VM = "victoria-metrics";

        String VM_CLUSTER = "victoria-metrics.cluster";
    }

    /**
     * Real-time database name.
     */
    interface RealTimeName {

        String REDIS = "redis";

        String MEMORY = "memory";
    }

}
