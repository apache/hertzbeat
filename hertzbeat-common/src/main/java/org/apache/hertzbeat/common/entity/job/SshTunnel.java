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
     * enable ssh tunnel
     */
    private String enable = "false";

    /**
     * IP ADDRESS OR DOMAIN NAME OF THE PEER HOST
     */
    private String host;

    /**
     * Peer host port
     */
    private String port = "22";

    /**
     * TIME OUT PERIOD
     */
    private String timeout = "6000";

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
     * private key passphrase (optional)
     */
    private String privateKeyPassphrase;

    /**
     * share connection session
     */
    private String shareConnection = "true";

    /**
     * Local Port (optional, default generate random port)
     */
    private String localPort;
}
