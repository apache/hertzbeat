package org.apache.hertzbeat.common.entity.job;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.job.protocol.CommonRequestProtocol;
import org.apache.hertzbeat.common.entity.job.protocol.Protocol;

/**
 * @author LiKang
 * @date 2025-01-20 08:51
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SshTunnel implements CommonRequestProtocol, Protocol {

    /**
     * IP ADDRESS OR DOMAIN NAME OF THE PEER HOST
     */

    private String host;

    /**
     * Peer host port
     */
    private String port;

    /**
     * TIME OUT PERIOD
     */
    private String timeout;

    /**
     * UserName
     */
    private String username;

    /**
     * Password (optional)
     */
    private String password;

    /**
     * Private key (optional)
     */
    private String privateKey;

    /**
     * reuse connection session
     */
    private String reuseConnection = "true";

    /**
     * Local Port (optional)
     */
    private String localPort;
}
