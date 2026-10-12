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

import jakarta.mail.Session;
import jakarta.mail.Transport;
import java.time.Duration;
import java.util.Optional;
import java.util.Properties;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MailConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MailSecurity;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;

/** Bounded mail transport connection/authentication adapter; it never sends a message. */
public final class JakartaMailConnectionProbe implements MailConnectionProbe {
    private final Duration timeout;

    public JakartaMailConnectionProbe(Duration timeout) {
        this.timeout = timeout;
    }

    @Override
    public Optional<SetupErrorCode> probe(MailConfiguration configuration) {
        String protocol = configuration.security() == MailSecurity.TLS ? "smtps" : "smtp";
        Properties properties = properties(protocol, configuration.security());
        Session session = Session.getInstance(properties);
        try (Transport transport = session.getTransport(protocol)) {
            transport.connect(configuration.host(), configuration.port(),
                    configuration.username(), configuration.password());
            return Optional.empty();
        } catch (Exception failure) {
            return Optional.of(SetupErrorCode.MAIL_CONNECTION_FAILED);
        }
    }

    private Properties properties(String protocol, MailSecurity security) {
        int millis = Math.toIntExact(timeout.toMillis());
        Properties properties = new Properties();
        properties.setProperty("mail." + protocol + ".connectiontimeout", Integer.toString(millis));
        properties.setProperty("mail." + protocol + ".timeout", Integer.toString(millis));
        properties.setProperty("mail." + protocol + ".writetimeout", Integer.toString(millis));
        if (security == MailSecurity.STARTTLS) {
            properties.setProperty("mail.smtp.starttls.enable", "true");
            properties.setProperty("mail.smtp.starttls.required", "true");
        }
        return properties;
    }
}
