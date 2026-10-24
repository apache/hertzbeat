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

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * redfish collection schema
 */
public class RedfishCollectionSchema {

    /**
     * Candidate collection uris per resource, most recent schema first.
     * Redfish 2020.4 moved fans and power supplies from the embedded Thermal/Power
     * arrays into their own collections, but shipped BMC firmware still serves only
     * the legacy layout, so both have to be probed.
     */
    private static final Map<String, List<String>> SCHEMA_MAP = Map.of(
            "Chassis", List.of("/redfish/v1/Chassis"),
            "Fan", List.of("/redfish/v1/Chassis/{ChassisId}/ThermalSubsystem/Fans",
                    "/redfish/v1/Chassis/{ChassisId}/Thermal#/Fans"),
            "Battery", List.of("/redfish/v1/Chassis/{ChassisId}/PowerSubsystem/Batteries"),
            "PowerSupply", List.of("/redfish/v1/Chassis/{ChassisId}/PowerSubsystem/PowerSupplies",
                    "/redfish/v1/Chassis/{ChassisId}/Power#/PowerSupplies"));

    public static List<String> getSchemas(String key) {
        return SCHEMA_MAP.getOrDefault(key, Collections.emptyList());
    }

}
