package org.dromara.hertzbeat.common.entity.job.protocol;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.commons.lang3.StringUtils;

/**
 * @author Calvin
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DnsProtocol {
    private String dnsServerIP;
    private String port;
    private String address;
    private String timeout;
    private String tcp;

    public boolean isInvalid() {
        return StringUtils.isAnyBlank(dnsServerIP, port, address, timeout, tcp);
    }
}
