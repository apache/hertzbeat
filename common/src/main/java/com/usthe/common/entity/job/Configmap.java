package com.usthe.common.entity.job;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 监控配置参数属性及值
 * 过程中需要将协议配置参数里面的标识符为^_^key^_^的内容替换为配置参数里的真实值
 * @author tomsun28
 * @date 2021/10/29 22:04
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Configmap {

    /**
     * 参数key,将协议配置参数里面的标识符为^^_key_^^的内容替换为配置参数里的真实值
     */
    private String key;

    /**
     * 参数value
     */
    private Object value;

    /**
     * 参数类型 0:数字 1:字符串 2:加密串
     * number,string,secret
     * 数字,非加密字符串,加密字符串
     */
    private byte type = 1;
}
