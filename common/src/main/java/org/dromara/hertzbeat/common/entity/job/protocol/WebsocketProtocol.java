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
public class WebsocketProtocol {
    /**
     * Websocket 主机ip或域名
     */
    private String host;

    /**
     * Websocket 主机端口
     */
    private String port;
}
