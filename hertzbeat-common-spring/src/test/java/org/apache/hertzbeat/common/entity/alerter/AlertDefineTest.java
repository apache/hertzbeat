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

package org.apache.hertzbeat.common.entity.alerter;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.LongStream;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Test case for {@link AlertDefine}
 */
class AlertDefineTest {

    private final ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
    private final Validator validator = factory.getValidator();

    @Test
    void exprShouldAllowBindingManyMonitors() {
        String boundMonitors = LongStream.range(0, 76)
                .mapToObj(id -> "equals(__instance__, \"" + (653868108767488L + id) + "\")")
                .collect(Collectors.joining(" or "));
        String expr = "equals(__app__,\"ping\") && equals(__available__,\"down\") && (" + boundMonitors + ")";
        assertTrue(expr.length() > 2048);

        AlertDefine define = AlertDefine.builder()
                .name("ping-offline")
                .type("realtime_metric")
                .expr(expr)
                .template("instance {{ $labels.instance }} is offline")
                .build();

        Set<ConstraintViolation<AlertDefine>> violations = validator.validate(define);
        assertTrue(violations.isEmpty(), "binding many monitors should not fail validation: " + violations);
    }

    @Test
    void oversizedExprShouldReportCharacterLength() {
        AlertDefine define = AlertDefine.builder()
                .name("ping-offline")
                .type("realtime_metric")
                .expr("x".repeat(65536))
                .template("template")
                .build();

        Set<ConstraintViolation<AlertDefine>> violations = validator.validate(define);
        assertEquals(1, violations.size());
        assertEquals("expr", violations.iterator().next().getPropertyPath().toString());
    }
}
