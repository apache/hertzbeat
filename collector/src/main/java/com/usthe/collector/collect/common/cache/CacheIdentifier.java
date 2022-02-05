package com.usthe.collector.collect.common.cache;

import lombok.Builder;
import lombok.Data;

/**
 * 缓存key唯一标识符
 *
 *
 */
@Data
@Builder
public class CacheIdentifier {

    private String ip;

    private String port;

    private String username;

    private String password;

}
