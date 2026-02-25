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

package org.apache.hertzbeat.common.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import com.google.protobuf.InvalidProtocolBufferException;
import com.google.protobuf.util.JsonFormat;
import org.apache.hertzbeat.common.util.entity.PersonTest.Person;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link ProtoJsonUtil}
 */
class ProtoJsonUtilTest {

    private Person samplePerson;
    private String sampleJson;

    @BeforeEach
    void setUp() {

        samplePerson = Person.newBuilder()
                .setName("John Doe")
                .setId(123)
                .setEmail("john.doe@example.com")
                .build();

        sampleJson = "{ \"name\": \"John Doe\", \"id\": 123, \"email\": \"john.doe@example.com\" }";
    }

    @Test
    void toJsonStr() throws InvalidProtocolBufferException {

        String json = ProtoJsonUtil.toJsonStr(samplePerson);
        String expectedJson = JsonFormat.printer().print(samplePerson);
        assertEquals(expectedJson, json);

        json = ProtoJsonUtil.toJsonStr(null);
        assertNull(json);
    }

    @Test
    void toProtobuf() {

        Person.Builder builder = Person.newBuilder();
        Person person = (Person) ProtoJsonUtil.toProtobuf(sampleJson, builder);
        assertEquals(samplePerson, person);

        String invalidJson = "{ \"name\": \"John Doe\", \"id\": \"not-a-number\" }";
        builder = Person.newBuilder();
        person = (Person) ProtoJsonUtil.toProtobuf(invalidJson, builder);

        assertNull(person);
    }

}
