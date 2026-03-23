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

package org.apache.hertzbeat.startup;

import static org.junit.jupiter.api.Assertions.fail;

import io.netty.channel.ChannelOption;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Mono;
import reactor.netty.Connection;
import reactor.netty.tcp.TcpClient;

/**
 * Guards the startup runtime against Reactor Netty / Netty mismatches that only show up when a client loop
 * is created for MySQL R2DBC collection.
 */
class ReactorNettyCompatibilityTest {

    @Test
    void reactorNettyClientLoopCanBeCreated() {
        Connection connection = null;
        try {
            connection = TcpClient.create()
                    .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 1000)
                    .host("127.0.0.1")
                    .port(9)
                    .connect()
                    .onErrorResume(throwable -> Mono.empty())
                    .block(Duration.ofSeconds(3));
        } catch (NoClassDefFoundError error) {
            fail("Startup runtime is missing a Reactor Netty dependency needed by MySQL R2DBC collection", error);
        } finally {
            if (connection != null) {
                connection.disposeNow();
            }
        }
    }
}
