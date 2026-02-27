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

package org.apache.hertzbeat.collector.collect.redfish;

import java.util.Map;

/**
 * redfish collection schema
 */
public class RedfishCollectionSchema {

    private static final Map<String, String> schemaMap = Map.of(
            "Chassis", "/redfish/v1/Chassis",
            "Fan", "/redfish/v1/Chassis/{ChassisId}/ThermalSubsystem/Fans",
            "Battery", "/redfish/v1/Chassis/{ChassisId}/PowerSubsystem/Batteries",
            "PowerSupply", "/redfish/v1/Chassis/{ChassisId}/PowerSubsystem/PowerSupplies");

    public static String getSchema(String key) {
        return schemaMap.get(key);
    }

}
