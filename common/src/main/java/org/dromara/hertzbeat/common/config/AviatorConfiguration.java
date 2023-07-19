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

package org.dromara.hertzbeat.common.config;

import com.googlecode.aviator.AviatorEvaluator;
import com.googlecode.aviator.lexer.token.OperatorType;
import com.googlecode.aviator.runtime.function.AbstractFunction;
import com.googlecode.aviator.runtime.type.*;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;
import java.util.regex.Pattern;

/**
 * @author tomsun28
 *
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

        // 配置自定义aviator函数
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

        AviatorEvaluator.getInstance().addFunction(new StrContainsFunction());
        AviatorEvaluator.getInstance().addFunction(new StrExistsFunction());
        AviatorEvaluator.getInstance().addFunction(new StrMatchesFunction());
    }

    /**
     * 自定义aviator判断字符串是否相等函数
     */
    private static class StrEqualFunction extends AbstractFunction {
        @Override
        public AviatorObject call(Map<String, Object> env, AviatorObject arg1, AviatorObject arg2) {
            if (arg1 == null || arg2 == null) {
                return AviatorBoolean.FALSE;
            }
            Object leftTmp = arg1.getValue(env);
            Object rightTmp = arg2.getValue(env);
            if (leftTmp == null || rightTmp == null) {
                return AviatorBoolean.FALSE;
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

    /**
     * 自定义aviator判断字符串1是否包含字符串2 (case-insensitive)
     */
    private static class StrContainsFunction extends AbstractFunction {
        @Override
        public AviatorObject call(Map<String, Object> env, AviatorObject arg1, AviatorObject arg2) {
            if (arg1 == null || arg2 == null) {
                return AviatorBoolean.FALSE;
            }
            Object leftTmp = arg1.getValue(env);
            Object rightTmp = arg2.getValue(env);
            if (leftTmp == null || rightTmp == null) {
                return AviatorBoolean.FALSE;
            }
            String left = String.valueOf(leftTmp);
            String right = String.valueOf(rightTmp);
            return AviatorBoolean.valueOf(StringUtils.containsIgnoreCase(left, right));
        }
        @Override
        public String getName() {
            return "contains";
        }
    }

    /**
     * 自定义aviator判断环境中是否存在字符串
     */
    private static class StrExistsFunction extends AbstractFunction {
        @Override
        public AviatorObject call(Map<String, Object> env, AviatorObject arg) {
            if (arg == null) {
                return AviatorBoolean.FALSE;
            }
            Object keyTmp = arg.getValue(env);
            if (keyTmp == null) {
                return AviatorBoolean.FALSE;
            }
            String key = String.valueOf(keyTmp);
            return AviatorBoolean.valueOf(env.containsKey(key));
        }
        @Override
        public String getName() {
            return "exists";
        }
    }

    /**
     * 自定义aviator判断字符串是否匹配regex
     * - regex需要加上""或者''
     */
    private static class StrMatchesFunction extends AbstractFunction {
        @Override
        public AviatorObject call(Map<String, Object> env, AviatorObject arg1, AviatorObject arg2) {
            if (arg1 == null || arg2 == null) {
                return AviatorBoolean.FALSE;
            }
            Object strTmp = arg1.getValue(env);
            Object regexTmp = arg2.getValue(env);
            if (strTmp == null || regexTmp == null) {
                return AviatorBoolean.FALSE;
            }
            String str = String.valueOf(strTmp);
            String regex = String.valueOf(regexTmp);
            boolean isMatch = Pattern.compile(regex).matcher(str).matches();
            return AviatorBoolean.valueOf(isMatch);
        }
        @Override
        public String getName() {
            return "matches";
        }
    }
}
