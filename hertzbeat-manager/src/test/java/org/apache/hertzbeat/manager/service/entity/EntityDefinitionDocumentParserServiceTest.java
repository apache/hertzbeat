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

package org.apache.hertzbeat.manager.service.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionRequest;
import org.junit.jupiter.api.Test;

/**
 * Contract for the entity definition document parser extracted from the large entity service.
 */
class EntityDefinitionDocumentParserServiceTest {

    private final EntityDefinitionDocumentParserService documentParserService =
            new EntityDefinitionDocumentParserService();

    @Test
    void parseDefinitionRecordsDetectsFormatAndUnwrapsKubernetesListItems() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setContent("""
                {
                  "apiVersion": "v1",
                  "kind": "List",
                  "items": [
                    {
                      "apiVersion": "hertzbeat/v1",
                      "kind": "service",
                      "metadata": {
                        "name": "checkout-api",
                        "namespace": "commerce"
                      }
                    },
                    {
                      "apiVersion": "hertzbeat/v1",
                      "kind": "database",
                      "metadata": {
                        "name": "orders-db",
                        "namespace": "commerce"
                      }
                    }
                  ]
                }
                """);

        List<Map<String, Object>> records = documentParserService.parseDefinitionRecords(request);

        assertEquals(2, records.size());
        assertEquals("checkout-api", metadataName(records.get(0)));
        assertEquals("orders-db", metadataName(records.get(1)));
    }

    @Test
    void parseDefinitionRecordsReadsMultiDocumentYamlInStableOrder() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("yaml");
        request.setContent("""
                apiVersion: hertzbeat/v1
                kind: service
                metadata:
                  name: checkout-api
                ---
                apiVersion: hertzbeat/v1
                kind: api
                metadata:
                  name: checkout-public-api
                """);

        List<Map<String, Object>> records = documentParserService.parseDefinitionRecords(request);

        assertEquals(2, records.size());
        assertEquals("checkout-api", metadataName(records.get(0)));
        assertEquals("checkout-public-api", metadataName(records.get(1)));
    }

    @Test
    void parseDefinitionRecordsExtractsCurlPayloadBeforeFormatDetection() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("curl");
        request.setContent("""
                curl -X POST http://127.0.0.1:1157/api/entity/definition -d '{"apiVersion":"hertzbeat/v1","kind":"service","metadata":{"name":"curl-checkout"}}'
                """);

        List<Map<String, Object>> records = documentParserService.parseDefinitionRecords(request);

        assertEquals(1, records.size());
        assertEquals("curl-checkout", metadataName(records.getFirst()));
    }

    @Test
    void parseDefinitionRecordsRejectsBlankContent() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setContent("   ");

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> documentParserService.parseDefinitionRecords(request));

        assertEquals("Entity definition content can not be blank.", exception.getMessage());
    }

    @Test
    void parseDefinitionRecordsRejectsUnsupportedRoot() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("json");
        request.setContent("\"not-an-object\"");

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> documentParserService.parseDefinitionRecords(request));

        assertEquals("Entity definition must be a yaml or json object.", exception.getMessage());
    }

    @SuppressWarnings("unchecked")
    private String metadataName(Map<String, Object> record) {
        return String.valueOf(((Map<String, Object>) record.get("metadata")).get("name"));
    }
}
