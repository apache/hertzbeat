package com.usthe.collector.collect.common;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * java common 的配置属性
 * @author tomsun28
 * @date 2021/10/16 14:23
 */
@Component
@ConfigurationProperties(prefix = "collector.common")
public class CollectorProperties {

}
