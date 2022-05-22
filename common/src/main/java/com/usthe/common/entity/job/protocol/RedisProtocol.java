package com.usthe.common.entity.job.protocol;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 *
 * @version 1.0
 * Created by Musk.Chen on 2022/5/17
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RedisProtocol {

    /**
     * 对端主机ip或域名
     */
    private String host;

    /**
     * 端口号
     */
    private String port;

    /**
     * Redis用户名(可选)
     */
    private String username;

    /**
     * Redis密码(可选)
     */
    private String password;

    /**
     * 超时时间
     */
    private String timeout;

}
