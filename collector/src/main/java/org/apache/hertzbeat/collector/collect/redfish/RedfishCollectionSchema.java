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
