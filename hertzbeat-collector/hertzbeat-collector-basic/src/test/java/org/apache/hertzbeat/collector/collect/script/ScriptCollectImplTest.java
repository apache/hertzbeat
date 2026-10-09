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

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.ScriptProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link ScriptCollectImpl}
 */
public class ScriptCollectImplTest {
    private ScriptCollectImpl scriptCollect;
    private CollectRep.MetricsData.Builder builder;

    @BeforeEach
    void setUp() throws Exception {
        scriptCollect = new ScriptCollectImpl();
        builder = CollectRep.MetricsData.newBuilder();
    }

    @Test
    void preCheck() {
        // metrics is null
        assertThrows(IllegalArgumentException.class, () -> {
            scriptCollect.preCheck(null);
        });

        // protocol is null
        assertThrows(IllegalArgumentException.class, () -> {
            Metrics metrics = new Metrics();
            scriptCollect.preCheck(metrics);
        });

        // charset is null
        assertThrows(IllegalArgumentException.class, () -> {
            ScriptProtocol scriptProtocol = ScriptProtocol.builder().build();
            Metrics metrics = new Metrics();
            metrics.setScript(scriptProtocol);
            scriptCollect.preCheck(metrics);
        });

        // parse type is null
        assertThrows(IllegalArgumentException.class, () -> {
            ScriptProtocol scriptProtocol = ScriptProtocol.builder().charset("utf-8").build();
            Metrics metrics = new Metrics();
            metrics.setScript(scriptProtocol);
            scriptCollect.preCheck(metrics);
        });

        // script tool is null
        assertThrows(IllegalArgumentException.class, () -> {
            ScriptProtocol scriptProtocol = ScriptProtocol.builder().charset("utf-8").parseType("json").build();
            Metrics metrics = new Metrics();
            metrics.setScript(scriptProtocol);
            scriptCollect.preCheck(metrics);
        });

        // script command is null
        assertThrows(IllegalArgumentException.class, () -> {
            ScriptProtocol scriptProtocol = ScriptProtocol.builder().charset("utf-8").parseType("json").scriptTool("sh").build();
            Metrics metrics = new Metrics();
            metrics.setScript(scriptProtocol);
            scriptCollect.preCheck(metrics);
        });

        // script path is null
        assertDoesNotThrow(() -> {
            ScriptProtocol scriptProtocol = ScriptProtocol.builder().charset("utf-8").parseType("json").scriptTool("sh").scriptCommand("ls").build();
            Metrics metrics = new Metrics();
            metrics.setScript(scriptProtocol);
            scriptCollect.preCheck(metrics);
        });

        // everything is ok
        assertDoesNotThrow(() -> {
            ScriptProtocol scriptProtocol = ScriptProtocol.builder().charset("utf-8").parseType("json").scriptTool("sh").scriptPath("/tmp").build();
            Metrics metrics = new Metrics();
            metrics.setScript(scriptProtocol);
            scriptCollect.preCheck(metrics);
        });
    }

    @Test
    void collect() {
        // not support script tool with command
        assertDoesNotThrow(() -> {
            ScriptProtocol scriptProtocol = ScriptProtocol.builder().charset("utf-8").parseType("json").scriptTool("sh").scriptCommand("cmd").build();
            Metrics metrics = new Metrics();
            metrics.setScript(scriptProtocol);

            builder = CollectRep.MetricsData.newBuilder();
            scriptCollect.collect(builder, metrics);
            assertEquals(CollectRep.Code.FAIL, builder.getCode());
        });

        
        // not support script tool with scriptpath
        assertDoesNotThrow(() -> {
            ScriptProtocol scriptProtocol = ScriptProtocol.builder().charset("utf-8").parseType("json").scriptTool("sh").scriptPath("cmd").build();
            Metrics metrics = new Metrics();
            metrics.setScript(scriptProtocol);

            builder = CollectRep.MetricsData.newBuilder();
            scriptCollect.collect(builder, metrics);
            assertEquals(CollectRep.Code.FAIL, builder.getCode());
        });

        // without script command and path
        assertDoesNotThrow(() -> {
            ScriptProtocol scriptProtocol = ScriptProtocol.builder().charset("utf-8").parseType("json").build();
            Metrics metrics = new Metrics();
            metrics.setScript(scriptProtocol);

            builder = CollectRep.MetricsData.newBuilder();
            scriptCollect.collect(builder, metrics);
            assertEquals(CollectRep.Code.FAIL, builder.getCode());
        });

        // empty stdout without stderr should be treated as empty one-row data
        assertDoesNotThrow(() -> {
            ScriptProtocol scriptProtocol = ScriptProtocol.builder()
                    .charset("utf-8")
                    .parseType("oneRow")
                    .scriptTool("bash")
                    .scriptCommand("grep -o 'centos-hermitlv' /dev/null")
                    .build();
            Metrics metrics = new Metrics();
            metrics.setScript(scriptProtocol);
            metrics.setAliasFields(List.of("nfs_mount"));

            builder = CollectRep.MetricsData.newBuilder();
            scriptCollect.collect(builder, metrics);
            assertEquals(CollectRep.Code.SUCCESS, builder.getCode());
            assertEquals(1, builder.getValuesCount());
            assertEquals(CommonConstants.NULL_VALUE, builder.getValues(0).getColumns(0));
        });

        // partial output missing more than one trailing field: the old length check
        // (lines + 1 < aliases) dropped the whole row here, losing the collected values
        assertDoesNotThrow(() -> {
            ScriptProtocol scriptProtocol = ScriptProtocol.builder()
                    .charset("utf-8")
                    .parseType("oneRow")
                    .scriptTool("bash")
                    .scriptCommand("echo 52; echo 35.8033; grep -o 'centos-hermitlv' /dev/null")
                    .build();
            Metrics metrics = new Metrics();
            metrics.setScript(scriptProtocol);
            metrics.setAliasFields(List.of("cpu", "memory", "disk", "nfs_mount"));

            builder = CollectRep.MetricsData.newBuilder();
            scriptCollect.collect(builder, metrics);
            assertEquals(CollectRep.Code.SUCCESS, builder.getCode());
            assertEquals(1, builder.getValuesCount());
            assertEquals("52", builder.getValues(0).getColumns(0));
            assertEquals("35.8033", builder.getValues(0).getColumns(1));
            assertEquals(CommonConstants.NULL_VALUE, builder.getValues(0).getColumns(2));
            assertEquals(CommonConstants.NULL_VALUE, builder.getValues(0).getColumns(3));
        });

        // a command that silently exits 1 with no output is indistinguishable from a
        // grep no-match, so it is deliberately accepted as an empty success
        assertDoesNotThrow(() -> {
            ScriptProtocol scriptProtocol = ScriptProtocol.builder()
                    .charset("utf-8")
                    .parseType("oneRow")
                    .scriptTool("bash")
                    .scriptCommand("exit 1")
                    .build();
            Metrics metrics = new Metrics();
            metrics.setScript(scriptProtocol);
            metrics.setAliasFields(List.of("nfs_mount"));

            builder = CollectRep.MetricsData.newBuilder();
            scriptCollect.collect(builder, metrics);
            assertEquals(CollectRep.Code.SUCCESS, builder.getCode());
            assertEquals(CommonConstants.NULL_VALUE, builder.getValues(0).getColumns(0));
        });

        // non-empty exit code without stderr should still fail when it is not the grep-style no-match case
        assertDoesNotThrow(() -> {
            ScriptProtocol scriptProtocol = ScriptProtocol.builder()
                    .charset("utf-8")
                    .parseType("oneRow")
                    .scriptTool("bash")
                    .scriptCommand("exit 2")
                    .build();
            Metrics metrics = new Metrics();
            metrics.setScript(scriptProtocol);
            metrics.setAliasFields(List.of("nfs_mount"));

            builder = CollectRep.MetricsData.newBuilder();
            scriptCollect.collect(builder, metrics);
            assertEquals(CollectRep.Code.FAIL, builder.getCode());
            assertTrue(builder.getMsg().contains("code: 2"));
        });
    }

    @Test
    void supportProtocol() {
        assertEquals(DispatchConstants.PROTOCOL_SCRIPT, scriptCollect.supportProtocol());
    }
}
