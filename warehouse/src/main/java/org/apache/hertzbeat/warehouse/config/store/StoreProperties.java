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

package org.apache.hertzbeat.warehouse.config.store;

import org.apache.hertzbeat.warehouse.config.store.greptime.GreptimeProperties;
import org.apache.hertzbeat.warehouse.config.store.influxdb.InfluxdbProperties;
import org.apache.hertzbeat.warehouse.config.store.iotdb.IotDbProperties;
import org.apache.hertzbeat.warehouse.config.store.jpa.JpaProperties;
import org.apache.hertzbeat.warehouse.config.store.memory.MemoryProperties;
import org.apache.hertzbeat.warehouse.config.store.redis.RedisProperties;
import org.apache.hertzbeat.warehouse.config.store.tdengine.TdEngineProperties;
import org.apache.hertzbeat.warehouse.config.store.vm.VictoriaMetricsProperties;

/**
 * Scheduling data export configuration properties
 * @param jpa use mysql/h2 jpa store metrics history data
 * @param memory Memory storage configuration information
 * @param influxdb influxdb configuration information
 * @param redis redis configuration information
 * @param victoriaMetrics VictoriaMetrics Properties
 * @param tdEngine TdEngine configuration information
 * @param iotDb IoTDB configuration information
 * @param greptime GrepTimeDB Config
 */
public record StoreProperties(JpaProperties jpa, MemoryProperties memory, InfluxdbProperties influxdb,
                              RedisProperties redis, VictoriaMetricsProperties victoriaMetrics,
                              TdEngineProperties tdEngine, IotDbProperties iotDb, GreptimeProperties greptime) {

}
