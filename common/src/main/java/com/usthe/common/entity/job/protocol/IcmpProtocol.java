package com.usthe.common.entity.job.protocol;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * icmp(即ping)协议配置
 *
 *
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class IcmpProtocol {
    /**
     * 对端主机ip或域名
     */
    private String host;

}
