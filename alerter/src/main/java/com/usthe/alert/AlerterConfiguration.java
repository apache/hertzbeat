package com.usthe.alert;

import com.googlecode.aviator.AviatorEvaluator;
import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.type.AviatorBoolean;
import com.googlecode.aviator.runtime.type.AviatorObject;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

/**
 * @author tomsun28
 * @date 2021/11/3 12:55
 */
@Configuration
public class AlerterConfiguration {

    private static final int AVIATOR_LRU_CACHE_SIZE = 1024;

    @Bean
    public void configAviatorEvaluator() {
        // 配置AviatorEvaluator使用LRU缓存编译后的表达式
        AviatorEvaluator.getInstance()
                .useLRUExpressionCache(AVIATOR_LRU_CACHE_SIZE)
                .addFunction(new StrEqualFunction());
    }

    /**
     * 自定义aviator判断字符串是否相等函数
     */
    private static class StrEqualFunction extends AbstractFunction {
        @Override
        public AviatorObject call(Map<String, Object> env, AviatorObject arg1, AviatorObject arg2) {
            if (arg1 == null || arg2 == null) {
                return AviatorBoolean.valueOf(false);
            }
            Object leftTmp = arg1.getValue(env);
            Object rightTmp = arg2.getValue(env);
            if (leftTmp == null || rightTmp == null) {
                return AviatorBoolean.valueOf(false);
            }
            String left = String.valueOf(leftTmp);
            String right = String.valueOf(rightTmp);
            return AviatorBoolean.valueOf(left.equalsIgnoreCase(right));
        }
        @Override
        public String getName() {
            return "equals";
        }
    }
}
