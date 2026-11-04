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
import static org.junit.jupiter.api.Assertions.assertFalse;
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
import org.junit.jupiter.api.condition.EnabledOnOs;
import org.junit.jupiter.api.condition.OS;

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

    @Test
    void normalizePowerShellStderrKeepsErrorsAndDropsProgress() {
        // -EncodedCommand turns progress/information records into CLIXML; only the
        // error entries should survive so failure messages stay readable
        String clixml = "#< CLIXML\n<Objs Version=\"1.1.0.1\" "
                + "xmlns=\"http://schemas.microsoft.com/powershell/2004/04\">"
                + "<Obj S=\"progress\" RefId=\"0\"><ToString>Preparing modules for first use.</ToString></Obj>"
                + "<S S=\"Error\">Get-Item : Cannot find path_x000D__x000A_At line:1 char:1</S>"
                + "<Obj S=\"information\" RefId=\"1\"><ToString>metric table</ToString></Obj></Objs>";
        assertEquals("Get-Item : Cannot find path\nAt line:1 char:1",
                ScriptCollectImpl.normalizePowerShellStderr(clixml));
    }

    @Test
    void normalizePowerShellStderrLeavesPlainTextUntouched() {
        String plain = "Get-Item : Cannot find path";
        assertEquals(plain, ScriptCollectImpl.normalizePowerShellStderr(plain));
    }

    @Test
    @EnabledOnOs(OS.WINDOWS)
    void collectPowershellWithQuotes() {
        // quoting-heavy PowerShell command as in #3907: with -Command the inner quotes
        // were stripped by the Windows command-line parser and the command failed with
        // empty output; -EncodedCommand must deliver the script verbatim
        assertDoesNotThrow(() -> {
            ScriptProtocol scriptProtocol = ScriptProtocol.builder()
                    .charset("utf-8")
                    .parseType("oneRow")
                    .scriptTool("powershell")
                    .scriptCommand("Write-Output \"hertzbeat powershell quote test\"")
                    .build();
            Metrics metrics = new Metrics();
            metrics.setScript(scriptProtocol);
            metrics.setAliasFields(List.of("message"));

            builder = CollectRep.MetricsData.newBuilder();
            scriptCollect.collect(builder, metrics);
            assertEquals(CollectRep.Code.SUCCESS, builder.getCode());
            assertEquals(1, builder.getValuesCount());
            assertEquals("hertzbeat powershell quote test", builder.getValues(0).getColumns(0));
        });
    }

    @Test
    @EnabledOnOs(OS.WINDOWS)
    void collectPowershellPipelineWithBacktickEscape() {
        // reproduces the #3907 shape: double-quoted string with a backtick escape and a
        // pipeline, which -Command mangled into "cannot recognize cmdlet" errors
        assertDoesNotThrow(() -> {
            ScriptProtocol scriptProtocol = ScriptProtocol.builder()
                    .charset("utf-8")
                    .parseType("oneRow")
                    .scriptTool("powershell")
                    .scriptCommand("\"line1`nline2\" | Out-String")
                    .build();
            Metrics metrics = new Metrics();
            metrics.setScript(scriptProtocol);
            metrics.setAliasFields(List.of("first_line", "second_line"));

            builder = CollectRep.MetricsData.newBuilder();
            scriptCollect.collect(builder, metrics);
            assertEquals(CollectRep.Code.SUCCESS, builder.getCode());
            assertEquals(1, builder.getValuesCount());
            assertEquals("line1", builder.getValues(0).getColumns(0));
            assertEquals("line2", builder.getValues(0).getColumns(1));
        });
    }

    @Test
    @EnabledOnOs(OS.WINDOWS)
    void failingPowerShellCommandReportsReadableError() {
        // a failing command writes its error as CLIXML through -EncodedCommand; the
        // collector must surface the PowerShell text, not the XML envelope
        ScriptProtocol scriptProtocol = ScriptProtocol.builder()
                .charset("utf-8")
                .parseType("oneRow")
                .scriptTool("powershell")
                .scriptCommand("Get-Item 'hertzbeat-definitely-missing-path' -ErrorAction Stop")
                .build();
        Metrics metrics = new Metrics();
        metrics.setScript(scriptProtocol);
        metrics.setAliasFields(List.of("path"));

        builder = CollectRep.MetricsData.newBuilder();
        scriptCollect.collect(builder, metrics);
        assertEquals(CollectRep.Code.FAIL, builder.getCode());
        assertFalse(builder.getMsg().contains("#< CLIXML"));
        assertFalse(builder.getMsg().contains("<Objs"));
    }
}
