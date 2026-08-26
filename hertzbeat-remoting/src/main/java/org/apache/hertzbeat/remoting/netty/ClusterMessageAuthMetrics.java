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

package org.apache.hertzbeat.remoting.netty;

import io.micrometer.core.instrument.Metrics;
import java.util.Locale;

/**
 * Low-cardinality authentication rollout and rejection counters.
 */
final class ClusterMessageAuthMetrics {

    private static final String REJECTED_COUNTER =
            "hertzbeat.cluster.message.authentication.rejected";
    private static final String LEGACY_COUNTER =
            "hertzbeat.cluster.message.authentication.legacy.accepted";
    private static final String HANDSHAKE_COUNTER =
            "hertzbeat.cluster.message.authentication.handshake.timeout";

    private ClusterMessageAuthMetrics() {
    }

    static void recordVerification(
            ClusterMessageAuthenticator.VerificationResult result,
            NettyRemotingAbstract.EndpointRole endpointRole) {
        if (result == ClusterMessageAuthenticator.VerificationResult.LEGACY_UNSIGNED) {
            Metrics.counter(LEGACY_COUNTER, "endpoint", endpointRole.metricTag()).increment();
        } else if (!result.accepted()) {
            Metrics.counter(
                    REJECTED_COUNTER,
                    "endpoint",
                    endpointRole.metricTag(),
                    "reason",
                    result.name().toLowerCase(Locale.ROOT))
                    .increment();
        }
    }

    static void recordHandshakeTimeout(
            NettyRemotingAbstract.EndpointRole endpointRole,
            ClusterMessageAuthConfig.Mode mode) {
        Metrics.counter(
                HANDSHAKE_COUNTER,
                "endpoint",
                endpointRole.metricTag(),
                "mode",
                mode.name().toLowerCase(Locale.ROOT))
                .increment();
    }
}
