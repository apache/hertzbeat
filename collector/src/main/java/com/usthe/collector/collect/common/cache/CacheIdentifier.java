package com.usthe.collector.collect.common.cache;

import lombok.Builder;
import lombok.Data;
import lombok.ToString;

/**
 * 缓存key唯一标识符
 *
 *
 */
@Data
@Builder
@ToString
public class CacheIdentifier {

    private String ip;

    private String port;

    private String username;

    private String password;

}
