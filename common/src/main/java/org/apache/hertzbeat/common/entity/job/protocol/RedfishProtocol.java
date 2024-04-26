package org.apache.hertzbeat.common.entity.job.protocol;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Redfish Protocol
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RedfishProtocol {
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
     * TIME OUT PERIOD
     */
    private String timeout;

    /**
     * Redfish Resource Name and Corresponding Collection URI
     */
    private String schema;
}
