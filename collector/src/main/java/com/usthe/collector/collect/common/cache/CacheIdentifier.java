package com.usthe.collector.collect.common.cache;

import lombok.Builder;
import lombok.Data;

import java.util.Objects;

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

    @Override
    public String toString() {
        return "CacheIdentifier {" +
                "ip='" + ip + '\'' +
                ", port='" + port + '\'' +
                ", username+password=>hash='" + Objects.hash(username, password) + '\'' +
                '}';
    }
}
