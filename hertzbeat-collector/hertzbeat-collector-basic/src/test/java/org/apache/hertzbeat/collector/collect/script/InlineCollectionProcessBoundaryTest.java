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

package org.apache.hertzbeat.collector.collect.script;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.common.entity.job.InlineCollectionPermit;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.ScriptProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.util.List;

class InlineCollectionProcessBoundaryTest {
    private Metrics metric() {
        return Metrics.builder()
                .protocol("script")
                .aliasFields(List.of("value"))
                .script(
                        ScriptProtocol.builder()
                                .scriptTool("bash")
                                .scriptCommand("printf 'value\n1\n'")
                                .charset("UTF-8")
                                .parseType("oneRow")
                                .workDirectory(System.getProperty("user.dir"))
                                .build())
                .build();
    }

    private InlineCollectionPermit permit(Metrics m, boolean current) {
        return new InlineCollectionPermit(
                List.of("bash", "-c", m.getScript().getScriptCommand()),
                System.getProperty("user.dir"),
                System.getProperty("user.name"),
                System.getProperty("os.name"),
                System.currentTimeMillis() + 10000,
                Clock.systemUTC(),
                () -> current);
    }

    @Test
    void harmlessFixtureStartsOnlyAfterTheExactPermitIsConsumed() {
        var m = metric();
        var p = permit(m, true);
        InlineCollectionPermit.bind(m, p);
        new ScriptCollectImpl().collect(CollectRep.MetricsData.newBuilder(), m);
        assertTrue(p.consumed());
        assertTrue(p.started());
    }

    @Test
    void cancelledPermitNeverStartsTheHarmlessFixture() {
        var m = metric();
        var p = permit(m, false);
        InlineCollectionPermit.bind(m, p);
        try {
            new ScriptCollectImpl().collect(CollectRep.MetricsData.newBuilder(), m);
        } catch (IllegalStateException expected) {
            assertFalse(p.started());
        }
        assertFalse(p.consumed());
        assertFalse(p.started());
    }
}
