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


package org.apache.hertzbeat.common.entity.job.protocol;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RegistryProtocolTest {

    @Test
    void isInvalid() {

        RegistryProtocol protocol1 = new RegistryProtocol();
        protocol1.setPort("8080");
        protocol1.setHost("127.0.0.1");
        assertTrue(protocol1.isInvalid());

        RegistryProtocol protocol2 = new RegistryProtocol();
        protocol2.setPort("8080");
        protocol2.setHost("www.baidu.com");
        assertTrue(protocol2.isInvalid());

        RegistryProtocol protocol3 = new RegistryProtocol();
        protocol3.setPort("8080");
        protocol3.setHost("www.baidu.com.");
        assertFalse(protocol3.isInvalid());

        RegistryProtocol protocol4 = new RegistryProtocol();
        protocol3.setPort("80800");
        protocol3.setHost("10.45.56.344");
        assertFalse(protocol4.isInvalid());
    }
}
