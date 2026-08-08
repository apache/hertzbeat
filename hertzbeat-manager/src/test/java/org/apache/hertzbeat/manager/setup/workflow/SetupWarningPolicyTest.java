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

import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MailConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MailSecurity;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.OptionsRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ServerInstrumentationConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupWarningCode;
import org.junit.jupiter.api.Test;

class SetupWarningPolicyTest {
    @Test
    void liveAndRestartInputsProduceTheSameWarnings() {
        var options = new OptionsRequest(
                new ServerInstrumentationConfiguration("http://localhost:4318", null), null,
                new MailConfiguration("localhost", 25, MailSecurity.NONE, null, null, "ops@example.test"));
        assertThat(SetupWarningPolicy.INSTANCE.evaluate(MetadataDatabaseKind.H2, options))
                .containsExactlyElementsOf(SetupWarningPolicy.INSTANCE.evaluate(
                        MetadataDatabaseKind.H2, "http://localhost:4318", null, MailSecurity.NONE));
    }

    @Test
    void whitespaceWrappedGrpcEndpointStillProducesPlaintextWarning() {
        var options = new OptionsRequest(
                new ServerInstrumentationConfiguration(null, "  http://localhost:4317  "), null, null);

        assertThat(SetupWarningPolicy.INSTANCE.evaluate(MetadataDatabaseKind.MYSQL, options))
                .containsExactly(SetupWarningCode.SERVER_OTLP_PLAINTEXT);
    }
}
