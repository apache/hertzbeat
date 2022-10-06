/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.usthe.common.config;

import com.googlecode.aviator.AviatorEvaluator;
import com.googlecode.aviator.lexer.token.OperatorType;
import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.type.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

/**
 * @author tomsun28
 * @date 2021/11/3 12:55
 */
@Configuration
@Slf4j
public class AviatorConfiguration {

    private static final int AVIATOR_LRU_CACHE_SIZE = 1024;

    @Bean
    public void configAviatorEvaluator() {
        // 配置AviatorEvaluator使用LRU缓存编译后的表达式
        AviatorEvaluator.getInstance()
                .useLRUExpressionCache(AVIATOR_LRU_CACHE_SIZE)
                .addFunction(new StrEqualFunction());
        AviatorEvaluator.getInstance().addOpFunction(OperatorType.BIT_OR, new AbstractFunction() {
            @Override
            public AviatorObject call(final Map<String, Object> env, final AviatorObject arg1,
                                      final AviatorObject arg2) {
                try {
                    Object value1 = arg1.getValue(env);
                    Object value2 = arg2.getValue(env);
                    Object currentValue = value1 == null ? value2 : value1;
                    if (arg1.getAviatorType() == AviatorType.String) {
                        return new AviatorString(String.valueOf(currentValue));
                    } else {
                        return AviatorDouble.valueOf(currentValue);
                    }
                } catch (Exception e) {
                    log.error(e.getMessage());
                }
                return arg1.bitOr(arg2, env);
            }
            @Override
            public String getName() {
                return OperatorType.BIT_OR.getToken();
            }
        });
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
