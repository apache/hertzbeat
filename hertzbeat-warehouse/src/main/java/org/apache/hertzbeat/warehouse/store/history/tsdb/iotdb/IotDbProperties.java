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

package org.apache.hertzbeat.warehouse.store.history.tsdb.iotdb;

import java.time.ZoneId;
import java.util.List;
import org.apache.hertzbeat.common.constants.ConfigConstants;
import org.apache.hertzbeat.common.constants.SignConstants;
import org.apache.hertzbeat.warehouse.constants.WarehouseConstants;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * IotDB configuration information
 * @param enabled Whether the iotDB data store is enabled
 * @param host iotDB host
 * @param expireTime save data expire time(ms)，-1 means it never expires Data storage time (unit: ms,-1 means never expire)
 *                   Note: Why is String used here instead of Long? At present, the set ttl of IoTDB only supports milliseconds as a unit,
 *                   and other units may be added later, so the String type is used for compatibility Data storage time (unit: ms, -1 means never expires)
 *                   Note: Why use String instead of Long here? Currently, IoTDB's set ttl only supports milliseconds as the unit.
 *                   Other units may be added later. In order to be compatible with the future, the String type is used.
 */

@ConfigurationProperties(prefix = ConfigConstants.FunctionModuleConstants.WAREHOUSE
		+ SignConstants.DOT
		+ WarehouseConstants.STORE
		+ SignConstants.DOT
		+ WarehouseConstants.HistoryName.IOT_DB)
public record IotDbProperties(@DefaultValue("false") boolean enabled,
                              @DefaultValue("127.0.0.1") String host,
                              @DefaultValue("6667") Integer rpcPort,
                              String username,
                              String password,
                              List<String> nodeUrls,
                              ZoneId zoneId,
                              long queryTimeoutInMs,
                              String expireTime) {
}
