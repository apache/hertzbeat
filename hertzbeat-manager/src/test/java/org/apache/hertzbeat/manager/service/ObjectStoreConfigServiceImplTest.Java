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

package org.apache.hertzbeat.manager.service;

import org.apache.hertzbeat.manager.service.impl.ObjectStoreConfigServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ObjectStoreConfigServiceImplTest {
    
    private ObjectStoreConfigServiceImpl objectStoreConfigService;

    @BeforeEach
    void setUp() {
        // Initialize the class under test
        objectStoreConfigService = new ObjectStoreConfigServiceImpl(null, null);
    }

    @Test
    void testValidateObsEndpoint() {
        // Test valid endpoint URL - should pass validation
        assertDoesNotThrow(() -> 
            objectStoreConfigService.validateObsEndpoint("https://obs.myhuaweicloud.com"));
        
        // Test various invalid scenarios
        // 1. Using http protocol (insecure)
        assertDoesNotThrow(() ->
            objectStoreConfigService.validateObsEndpoint("http://obs.myhuaweicloud.com"));
        
        // 2. Using invalid domain names
        assertThrows(IllegalArgumentException.class, () -> 
            objectStoreConfigService.validateObsEndpoint("https://obs.someotherdomain.com"));
        assertThrows(IllegalArgumentException.class, () ->
                objectStoreConfigService.validateObsEndpoint("https://obs.myhuaweicloud.com.abc.com"));
        
        // 3. Using internal network addresses
        assertThrows(IllegalArgumentException.class, () -> 
            objectStoreConfigService.validateObsEndpoint("https://127.0.0.1"));
        assertThrows(IllegalArgumentException.class, () -> 
            objectStoreConfigService.validateObsEndpoint("https://192.168.1.1"));
        assertThrows(IllegalArgumentException.class, () -> 
            objectStoreConfigService.validateObsEndpoint("https://10.0.0.1"));
        
        // 4. Test invalid URL format
        assertThrows(IllegalArgumentException.class, () -> 
            objectStoreConfigService.validateObsEndpoint("not-a-url"));
        
        // 5. Test null and empty values
        assertThrows(IllegalArgumentException.class, () -> 
            objectStoreConfigService.validateObsEndpoint(null));
        assertThrows(IllegalArgumentException.class, () -> 
            objectStoreConfigService.validateObsEndpoint(""));
    }
}