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

import static org.junit.jupiter.api.Assertions.assertEquals;
import java.util.List;
import org.apache.hertzbeat.collector.collect.ssh.SshCollectImpl;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.util.ReflectionTestUtils;

/** Verifies both 1.9.x netcat parser entry points without running commands or SSH. */
class NetcatCollectorValueTest {

    @ParameterizedTest
    @ValueSource(strings = {"script", "ssh"})
    void preservesEqualsEmptyAndMissingValues(String protocol) {
        Object collector = protocol.equals("script") ? new ScriptCollectImpl() : new SshCollectImpl();
        var builder = CollectRep.MetricsData.newBuilder();
        ReflectionTestUtils.invokeMethod(collector, "parseResponseDataByNetcat",
                "control=ok\ntoken=abc==\nendpoint=http://localhost/path?mode=read\nempty=\n",
                List.of("control", "token", "endpoint", "empty", "missing"), builder, 100L);
        assertEquals(List.of("ok", "abc==", "http://localhost/path?mode=read", "", CommonConstants.NULL_VALUE),
                builder.getValues(0).getColumnsList());
    }

    @ParameterizedTest
    @ValueSource(strings = {"script", "ssh"})
    void preservesTabSeparatedValues(String protocol) {
        Object collector = protocol.equals("script") ? new ScriptCollectImpl() : new SshCollectImpl();
        var builder = CollectRep.MetricsData.newBuilder();
        ReflectionTestUtils.invokeMethod(collector, "parseResponseDataByNetcat", "control\tok\ntoken\tabc",
                List.of("control", "token"), builder, 100L);
        assertEquals(List.of("ok", "abc"), builder.getValues(0).getColumnsList());
    }
}
