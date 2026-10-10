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

package org.apache.hertzbeat.manager.setup.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.usthe.sureness.configuration.SurenessProperties;
import com.usthe.sureness.configuration.SurenessProperties.AuthType;
import java.util.Set;
import org.junit.jupiter.api.Test;

class DatabaseIdentityProcessorConfigurationTest {
    @Test
    void nullAndEmptyAuthConfigurationRetainStarterDefaults() {
        SurenessProperties properties = new SurenessProperties();
        properties.setAuths(null);
        assertEquals(Set.of(AuthType.BASIC, AuthType.JWT),
                DatabaseIdentityProcessorConfiguration.authTypes(properties));
        properties.setAuths(new AuthType[0]);
        assertEquals(Set.of(AuthType.BASIC, AuthType.JWT),
                DatabaseIdentityProcessorConfiguration.authTypes(properties));
    }

    @Test
    void explicitAuthConfigurationIsPreservedExactly() {
        SurenessProperties properties = new SurenessProperties();
        properties.setAuths(new AuthType[] {AuthType.DIGEST, AuthType.JWT});
        assertEquals(Set.of(AuthType.DIGEST, AuthType.JWT),
                DatabaseIdentityProcessorConfiguration.authTypes(properties));
    }
}
