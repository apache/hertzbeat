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
import com.googlecode.aviator.exception.UnsupportedFeatureException;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

/**
 * @author mikezzb
 *
 */
class AviatorConfigurationTest {

    @BeforeAll
    static void setUp() {
        AviatorConfiguration aviatorConfig = new AviatorConfiguration();
        aviatorConfig.configAviatorEvaluator();
    }

    @Test
    void testCustomStringFunctions() {
        Map<String, Object> env = new HashMap<>();
        env.put("k1", "Intel");
        env.put("k2", "intel");
        env.put("k3", "Ubuntu 18.04.6 LTS");
        env.put("k4", "ubuntu");
        env.put("k5", "Ubntu");
        env.put("k6", null);

        // test StrEqualFunction
        String expr1 = "equals(k1,k2)"; // case-insensitive
        Boolean res1 = (Boolean) AviatorEvaluator.compile(expr1).execute(env);
        Assertions.assertTrue(res1);

        String expr2 = "equals(k1,k3)";
        Boolean res2 = (Boolean) AviatorEvaluator.compile(expr2).execute(env);
        Assertions.assertFalse(res2);

        // test StrContainsFunction
        String expr3 = "contains(k3,k4)"; // case-insensitive
        Boolean res3 = (Boolean) AviatorEvaluator.compile(expr3).execute(env);
        Assertions.assertTrue(res3);

        String expr4 = "contains(k4,k3)";
        Boolean res4 = (Boolean) AviatorEvaluator.compile(expr4).execute(env);
        Assertions.assertFalse(res4);

        String expr5 = "contains(k3,k5)"; // subsequence
        Boolean res5 = (Boolean) AviatorEvaluator.compile(expr5).execute(env);
        Assertions.assertFalse(res5);

        // test StrExistsFunction
        String expr6 = "exists('DNE_Key1')";
        Boolean res6 = (Boolean) AviatorEvaluator.compile(expr6).execute(env);
        Assertions.assertTrue(res6);

        String expr7 = "exists(k6)";
        Boolean res7 = (Boolean) AviatorEvaluator.compile(expr7).execute(env);
        Assertions.assertFalse(res7);
        
        String expr21 = "exists('k5')";
        Boolean res21 = (Boolean) AviatorEvaluator.compile(expr21).execute(env);
        Assertions.assertTrue(res21);
        
        String expr22 = "exists(k5)";
        Boolean res22 = (Boolean) AviatorEvaluator.compile(expr22).execute(env);
        Assertions.assertTrue(res22);

        // test StrMatchesFunction
        String regex1 = "'^[a-zA-Z0-9]+$'"; // only alphanumeric
        String expr8 = "matches(k6," + regex1 + ")";
        env.put("k6", "Ubntu50681269");
        Boolean res8 = (Boolean) AviatorEvaluator.compile(expr8).execute(env);
        Assertions.assertTrue(res8);
        env.put("k6", "Ubnt_u50681269");
        Boolean res9 = (Boolean) AviatorEvaluator.compile(expr8).execute(env);
        Assertions.assertFalse(res9);

        String regex2 = "'^Ubuntu.*'"; // starts with
        String expr9 = "matches(k3," + regex2 + ")";
        Boolean res10 = (Boolean) AviatorEvaluator.compile(expr9).execute(env);
        Assertions.assertTrue(res10);
        env.put("k3", "Ubunt_u50681269");
        Boolean res11 = (Boolean) AviatorEvaluator.compile(expr9).execute(env);
        Assertions.assertFalse(res11);

        String regex3 = "\"^\\\\[LOG\\\\].*error$\""; // starts & ends with
        String expr10 = "matches(k7," + regex3 + ")";
        env.put("k7", "[LOG] detected system error");
        Boolean res12 = (Boolean) AviatorEvaluator.compile(expr10).execute(env);
        Assertions.assertTrue(res12);
        env.put("k7", "[LOG detected system error");
        Boolean res13 = (Boolean) AviatorEvaluator.compile(expr10).execute(env);
        Assertions.assertFalse(res13);
    }

    @Test
    void testRCE() {
        // test if 'new' syntax is disabled to prevent RCE
        Assertions.assertThrows(UnsupportedFeatureException.class, () -> {
            String expr1 = "let d = new java.util.Date();\n" +
                    "p(type(d));\n" +
                    "p(d);";
            AviatorEvaluator.compile(expr1, true).execute();
        });
        // test allowed features
        String expr2 = "let a = 0;\n" +
                "if (\"#{a}\" == \"0\") { a = -1; }\n" +
                "a == -1";
        Boolean result = (Boolean) AviatorEvaluator.compile(expr2, true).execute();
        Assertions.assertTrue(result);
    }
}
