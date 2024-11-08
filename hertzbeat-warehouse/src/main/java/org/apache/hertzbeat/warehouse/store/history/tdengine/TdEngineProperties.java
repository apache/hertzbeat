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

package org.apache.hertzbeat.warehouse.store.history.tdengine;

import org.apache.hertzbeat.common.constants.ConfigConstants;
import org.apache.hertzbeat.common.constants.SignConstants;
import org.apache.hertzbeat.warehouse.constants.WarehouseConstants;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 *
 * @param enabled Whether the TdEngine data store is enabled
 * @param url TdEngine connect url
 * @param driverClassName tdengine driver, default restful driver
 * @param username tdengine username
 * @param password  tdengine password
 * @param tableStrColumnDefineMaxLength auto create table's string column define max length : NCHAR(200)
 */

@ConfigurationProperties(prefix = ConfigConstants.FunctionModuleConstants.WAREHOUSE
		+ SignConstants.DOT
		+ WarehouseConstants.STORE
		+ SignConstants.DOT
		+ WarehouseConstants.HistoryName.TD_ENGINE)
public record TdEngineProperties(@DefaultValue("false") boolean enabled,
                                 @DefaultValue("jdbc:TAOS-RS://localhost:6041/demo") String url,
                                 @DefaultValue("com.taosdata.jdbc.rs.RestfulDriver") String driverClassName,
                                 String username, String password,
                                 @DefaultValue("200") int tableStrColumnDefineMaxLength) {
}
