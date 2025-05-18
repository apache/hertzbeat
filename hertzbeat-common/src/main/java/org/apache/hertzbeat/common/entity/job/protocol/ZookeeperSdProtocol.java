package org.apache.hertzbeat.common.entity.job.protocol;

import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Zookeeper service discovery protocol
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ZookeeperSdProtocol implements Protocol{
    
    private String url;

    private String pathPrefix;
}
