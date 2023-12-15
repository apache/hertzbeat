package org.dromara.hertzbeat.common.entity.job.protocol;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * @author dongfeng
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MemcachedProtocol {

    /**
     * Memcached 主机ip或域名
     */
    private String host;

    /**
     * Memcached 主机端口(默认11211)
     */
    private String port;


}
