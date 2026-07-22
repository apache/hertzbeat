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

package org.apache.hertzbeat.manager.component.validator.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.apache.hertzbeat.manager.component.validator.ParamValidator;
import org.apache.hertzbeat.manager.pojo.dto.MonitorParam;
import org.apache.hertzbeat.manager.pojo.dto.ParamDefineInfo;
import org.junit.jupiter.api.Test;

class ParamValidatorSensitiveErrorTest {

    @Test
    void validationFailuresUseGenericMessageWithoutCallerValuesOrDefinitionDetails() {
        assertSafeFailure(new JsonParamValidator(), definition("key-value", "Authorization"),
                "{\"Authorization\":\"Bearer caller-token\"");
        assertSafeFailure(new BooleanParamValidator(), definition("boolean", "token"), "caller-token");
        assertSafeFailure(new HostParamValidatorAdapter(), definition("host", "privateHost"), "caller token");
        assertSafeFailure(new NumberParamValidator(), definition("number", "privatePort"), "caller-token");

        ParamDefineInfo textDefinition = definition("text", "privateName");
        textDefinition.setLimit((short) 1);
        assertSafeFailure(new TextParamValidator(), textDefinition, "caller-token");
    }

    private static void assertSafeFailure(ParamValidator validator, ParamDefineInfo definition, String value) {
        MonitorParam parameter = new MonitorParam();
        parameter.setParamValue(value);

        IllegalArgumentException failure = assertThrows(
                IllegalArgumentException.class, () -> validator.validate(definition, parameter));
        assertEquals(ParamValidator.INVALID_PARAMETER_MESSAGE, failure.getMessage());
    }

    private static ParamDefineInfo definition(String type, String field) {
        ParamDefineInfo definition = new ParamDefineInfo();
        definition.setType(type);
        definition.setField(field);
        return definition;
    }
}
