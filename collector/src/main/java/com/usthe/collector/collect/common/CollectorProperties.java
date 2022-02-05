package com.usthe.collector.collect.common;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * java common 的配置属性
 *
 *
 */
@Component
@ConfigurationProperties(prefix = "collector.common")
public class CollectorProperties {

}
