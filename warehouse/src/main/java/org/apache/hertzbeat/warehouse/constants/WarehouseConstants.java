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

        String IOTDB = "iotdb";

        String JPA = "jpa";

        String TDENDINE = "tdengine";

        String VM = "vm";

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
