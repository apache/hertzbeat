package org.apache.hertzbeat.common.entity.job.protocol;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * IPMI2 Protocol
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class IpmiProtocol {
    /**
     * IP ADDRESS OR DOMAIN NAME OF THE PEER HOST
     */
    private String host;

    /**
     * Peer host port
     */
    private String port;

    /**
     * UserName
     */
    private String username;

    /**
     * Password
     */
    private String password;

    /**
     * command type: Chassis | Sensor | Raw
     */
    private String type;

    /**
     * (Optional) only used for the specific id search
     */
    private String id;

    /**
     * (Optional) only used when type is Raw
     */
    private Field field;


    static class Field {

    }
}
