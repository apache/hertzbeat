package com.usthe.common.entity.job;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Monitoring configuration parameter properties and values
 * 监控配置参数属性及值
 * During the process, you need to replace the content with the identifier ^_^key^_^
 * in the protocol configuration parameter with the real value in the configuration parameter
 * 过程中需要将协议配置参数里面的标识符为^_^key^_^的内容替换为配置参数里的真实值
 *
 * @author tomsun28
 * @date 2021/10/29 22:04
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Configmap {

    /**
     * Parameter key, replace the content with the identifier ^^_key_^^ in the protocol
     * configuration parameter with the real value in the configuration parameter
     * <p>
     * 参数key,将协议配置参数里面的标识符为^^_key_^^的内容替换为配置参数里的真实值
     */
    private String key;

    /**
     * parameter value  参数value
     */
    private Object value;

    /**
     * Parameter type 0: number 1: string 2: encrypted string 3: json string mapped by map
     * 参数类型 0:数字 1:字符串 2:加密串 3:map映射的json串
     * number,string,secret
     * 数字,非加密字符串,加密字符串
     */
    private byte type = 1;
}
