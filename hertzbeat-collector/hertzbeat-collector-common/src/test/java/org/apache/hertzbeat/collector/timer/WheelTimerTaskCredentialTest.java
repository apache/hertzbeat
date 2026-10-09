/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.collector.timer;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.HttpProtocol;
import org.apache.hertzbeat.common.util.AesUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class WheelTimerTaskCredentialTest {

    private static final String TEST_SECRET = "0123456789abcdef";

    @AfterEach
    void tearDown() {
        AesUtil.setDefaultSecretKey(AesUtil.DEFAULT_ENCODE_RULES);
    }

    @Test
    void decryptsTheMigratedCredentialBeforeProtocolReplacement() {
        AesUtil.setDefaultSecretKey(TEST_SECRET);
        String ciphertext = AesUtil.aesEncode("runtime-ollama-key");
        HttpProtocol.Authorization authorization = new HttpProtocol.Authorization();
        authorization.setType("Bearer Token");
        authorization.setBearerTokenToken("^_^apiKey^_^");
        Metrics metrics = Metrics.builder()
                .name("version")
                .interval(60)
                .http(HttpProtocol.builder().authorization(authorization).build())
                .build();
        Job job = Job.builder()
                .app("ollama")
                .defaultInterval(60)
                .configmap(List.of(new Configmap(
                        "apiKey",
                        ciphertext,
                        CommonConstants.PARAM_TYPE_PASSWORD)))
                .metrics(List.of(metrics))
                .build();

        new WheelTimerTask(job, timeout -> {
        });

        assertEquals("runtime-ollama-key",
                job.getMetrics().get(0).getHttp().getAuthorization().getBearerTokenToken());
    }
}
