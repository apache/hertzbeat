package com.usthe.common.entity.job.protocol;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 公共的jdbc规范实现的数据库配置信息
 * @author tomsun28
 * @date 2021/10/31 17:33
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class JdbcProtocol {
    /**
     * 对端主机ip或域名
     */
    private String host;
    /**
     * 端口号
     */
    private String port;
    /**
     * 数据库用户名(可选)
     */
    private String username;
    /**
     * 数据库密码(可选)
     */
    private String password;
    /**
     * 数据库
     */
    private String database;
    /**
     * 超时时间
     */
    private String timeout;
    /**
     * 数据库类型 mysql oracle ...
     */
    private String platform;
    /**
     * SQL查询方式： oneRow, multiRow, columns
     */
    private String queryType;
    /**
     * sql
     */
    private String sql;
    /**
     * 数据库链接url eg: jdbc:mysql://localhost:3306/usthe
     */
    private String url;
}
