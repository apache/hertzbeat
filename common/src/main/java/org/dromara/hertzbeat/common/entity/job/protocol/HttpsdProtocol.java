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
public class HttpsdProtocol {
    private String host;
    private String port;
    private String discoveryClientTypeName;

    public boolean isInvalid() {
        return StringUtils.isAnyBlank(host, port, discoveryClientTypeName);
    }
}
