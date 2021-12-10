package com.usthe.alert;

import com.googlecode.aviator.AviatorEvaluator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 *
 *
 */
@Configuration
public class AlerterConfiguration {

    private static final int AVIATOR_LRU_CACHE_SIZE = 1024;

    @Bean
    public void configAviatorEvaluator() {
        // 配置AviatorEvaluator使用LRU缓存编译后的表达式
        AviatorEvaluator.getInstance()
                .useLRUExpressionCache(AVIATOR_LRU_CACHE_SIZE);
    }
}
