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

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.Executors;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MailConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MailSecurity;
import org.junit.jupiter.api.Test;

class JakartaMailConnectionProbeTest {

    @Test
    void probeOpensAndClosesRealSmtpTransportWithoutSendingMail() throws Exception {
        try (ServerSocket server = new ServerSocket(0, 1, InetAddress.getLoopbackAddress());
             var executor = Executors.newSingleThreadExecutor()) {
            var conversation = executor.submit(() -> serveSmtp(server));
            MailConfiguration configuration = new MailConfiguration(
                    InetAddress.getLoopbackAddress().getHostAddress(), server.getLocalPort(),
                    MailSecurity.NONE, null, null, "hertzbeat@example.test");

            assertThat(new JakartaMailConnectionProbe(Duration.ofSeconds(3)).probe(configuration)).isEmpty();
            assertThat(conversation.get()).startsWith("EHLO ");
        }
    }

    private static String serveSmtp(ServerSocket server) throws Exception {
        try (var socket = server.accept();
             var reader = new BufferedReader(new InputStreamReader(
                     socket.getInputStream(), StandardCharsets.US_ASCII));
             var writer = new BufferedWriter(new OutputStreamWriter(
                     socket.getOutputStream(), StandardCharsets.US_ASCII))) {
            writer.write("220 localhost setup probe\r\n");
            writer.flush();
            String greeting = reader.readLine();
            writer.write("250 localhost\r\n");
            writer.flush();
            String quit = reader.readLine();
            if ("QUIT".equals(quit)) {
                writer.write("221 bye\r\n");
                writer.flush();
            }
            return greeting;
        }
    }
}
