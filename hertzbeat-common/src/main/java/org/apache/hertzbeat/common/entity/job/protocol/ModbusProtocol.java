package org.apache.hertzbeat.common.entity.job.protocol;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;


/**
 * Modbus Protocol
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ModbusProtocol {

    /**
     * IP ADDRESS OR DOMAIN NAME OF THE PEER HOST
     */
    private String host;
    /**
     * Port number
     */
    private String port;

    private String driverName;

    private String addressSyntax;

    private String slaveId;

    private String timeout;

    private List<String> registerAddresses;
}
