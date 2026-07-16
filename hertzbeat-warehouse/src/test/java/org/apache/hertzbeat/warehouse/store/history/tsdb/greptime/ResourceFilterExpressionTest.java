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

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class ResourceFilterExpressionTest {

    @Test
    void shouldParseMultipleResourceClauses() {
        var clauses = ResourceFilterExpression.parse(
                "resource.cloud.region = \"ap-southeast-1\" AND service.version != dev AND pod.name EXISTS");

        assertThat(clauses).extracting(ResourceFilterExpression.Clause::key)
                .containsExactly("cloud.region", "service.version", "pod.name");
        assertThat(clauses).extracting(ResourceFilterExpression.Clause::operator)
                .containsExactly(ResourceFilterExpression.Operator.EQUALS,
                        ResourceFilterExpression.Operator.NOT_EQUALS, ResourceFilterExpression.Operator.EXISTS);
    }

    @Test
    void shouldKeepAndInsideQuotedAttributeValue() {
        var clauses = ResourceFilterExpression.parse(
                "service.version = \"blue AND green\" AND k8s.pod.name NOT EXISTS");

        assertThat(clauses).hasSize(2);
        assertThat(clauses.getFirst().value()).isEqualTo("blue AND green");
        assertThat(clauses.getLast().operator()).isEqualTo(ResourceFilterExpression.Operator.NOT_EXISTS);
    }

    @Test
    void shouldRejectInvalidResourceExpression() {
        assertThatThrownBy(() -> ResourceFilterExpression.parse("cloud.region ~~ prod"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid resource filter expression");
        assertThatThrownBy(() -> ResourceFilterExpression.parse("service.name = \"unterminated"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid resource filter expression");
    }
}
