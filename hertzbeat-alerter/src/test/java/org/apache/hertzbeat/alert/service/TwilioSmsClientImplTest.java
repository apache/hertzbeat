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

package org.apache.hertzbeat.alert.service;

import org.apache.hertzbeat.alert.config.TwilioSmsProperties;
import org.apache.hertzbeat.alert.service.impl.TwilioSmsClientImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Test case for {@link TwilioSmsClientImpl}
 */
class TwilioSmsClientImplTest {

    @Test
    void getType() {
        TwilioSmsProperties twilioSmsProperties = new TwilioSmsProperties();
        twilioSmsProperties.setAccountSid("accountSid");
        twilioSmsProperties.setAuthToken("authToken");
        twilioSmsProperties.setTwilioPhoneNumber("twilioPhoneNumber");
        TwilioSmsClientImpl twilioSmsClient = new TwilioSmsClientImpl(twilioSmsProperties);

        assertEquals("twilio", twilioSmsClient.getType());
    }

    @ParameterizedTest
    @CsvSource({
            "accountSid, authToken, twilioPhoneNumber, true",
            "accountSid, authToken, '', false",
            "accountSid, '', twilioPhoneNumber, false",
            "accountSid, '', '', false",
            "'', authToken, twilioPhoneNumber, false",
            "'', authToken, '', false",
            "'', '', twilioPhoneNumber, false",
            "'', '', '', false",
    })
    void checkConfig(String accountSid, String authToken, String twilioPhoneNumber, boolean expected) {
        TwilioSmsProperties twilioSmsProperties = new TwilioSmsProperties();
        twilioSmsProperties.setAccountSid(accountSid);
        twilioSmsProperties.setAuthToken(authToken);
        twilioSmsProperties.setTwilioPhoneNumber(twilioPhoneNumber);
        TwilioSmsClientImpl twilioSmsClient = new TwilioSmsClientImpl(twilioSmsProperties);

        assertEquals(expected, twilioSmsClient.checkConfig());
    }
}