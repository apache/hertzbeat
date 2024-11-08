/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.common.entity.plugin;



import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;


/**
 * Test case for {@link PluginContext}
 */
class PluginContextTest {

    PluginContext pluginContext;
    Configmap host = new Configmap("host", "127.0.0.1", (byte) 1);

    @BeforeEach
    void init() {

        List<Configmap> params = Arrays.asList(host,
            new Configmap("port", "80", (byte) 0),
            new Configmap("enableSsl", "true", (byte) 1),
            new Configmap("max", "1725116706000", (byte) 1)
        );
        pluginContext = PluginContext.builder().params(params).build();
    }

    @Test
    void getString() {
        String host = pluginContext.param().getString("host", "192.168.0.1");
        assertEquals("127.0.0.1", host);
    }

    @Test
    void getInteger() {
        Integer port = pluginContext.param().getInteger("port", 100);
        assertEquals(80, port);
    }

    @Test
    void testGetNonExistentParameter() {
        Integer num = pluginContext.param().getInteger("num", 100);
        assertEquals(100, num);
    }

    @Test
    void testErrorFormat() {
        Integer host = pluginContext.param().getInteger("host", 100);
        assertEquals(100, host);
    }

    @Test
    void getBoolean() {
        boolean enableSsl = pluginContext.param().getBoolean("enableSsl", false);
        assertTrue(enableSsl);
    }

    @Test
    void getLong() {
        Long max = pluginContext.param().getLong("max", 1800000000000L);
        assertEquals(1725116706000L, max);
    }

    @Test
    void testImmutableData() {
        List<Configmap> list = pluginContext.param().allParams();
        Optional<Configmap> param = list.stream().filter(v -> v.getKey().equals("host")).findAny();
        if (param.isEmpty()) {
            throw new RuntimeException("error");
        }
        param.get().setValue("192.168.1.1");
        assertEquals(host.getValue(), "127.0.0.1");
    }
}
