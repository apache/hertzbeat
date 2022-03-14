package com.usthe.collector.collect.common.cache;

import lombok.Builder;
import lombok.Data;
import lombok.ToString;

/**
 * 缓存key唯一标识符
 * @author tomsun28
 * @date 2021/12/1 21:30
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
