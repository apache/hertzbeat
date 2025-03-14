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

import org.apache.hertzbeat.alert.config.AwsSmsProperties;
import org.apache.hertzbeat.alert.service.impl.AwsSmsClientImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Test case for {@link AwsSmsClientImpl}
 */
class AwsSmsClientImplTest {


    @Test
    void getType() {
        AwsSmsProperties awsSmsProperties = new AwsSmsProperties();
        awsSmsProperties.setAccessKeyId("accessKeyId");
        awsSmsProperties.setAccessKeySecret("accessKeySecret");
        awsSmsProperties.setRegion("region");
        AwsSmsClientImpl awsSmsClient = new AwsSmsClientImpl(awsSmsProperties);

        assertEquals("aws", awsSmsClient.getType());
    }

    @ParameterizedTest
    @CsvSource({
        "accessKeyId, accessKeySecret, region, true",
        "accessKeyId, accessKeySecret, '', false",
        "accessKeyId, '', region, false",
        "accessKeyId, accessKeySecret, '', false",
        "accessKeyId, '', '', false",
        "'', accessKeySecret, region, false",
        "'', accessKeySecret, '', false",
        "'', '', region, false",
        "'', accessKeySecret, '', false",
    })
    void checkConfig(String accessKeyId, String accessKeySecret, String region, boolean expected) {
        AwsSmsProperties awsSmsProperties = new AwsSmsProperties();
        awsSmsProperties.setAccessKeyId(accessKeyId);
        awsSmsProperties.setAccessKeySecret(accessKeySecret);
        awsSmsProperties.setRegion(region); 
        AwsSmsClientImpl awsSmsClient = new AwsSmsClientImpl(awsSmsProperties);

        assertEquals(expected, awsSmsClient.checkConfig());
    }
  


}
