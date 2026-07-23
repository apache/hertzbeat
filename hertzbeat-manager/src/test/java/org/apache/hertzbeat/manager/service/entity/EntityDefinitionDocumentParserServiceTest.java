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
import static org.junit.jupiter.api.Assertions.assertFalse;
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
    void parseDefinitionRecordsUnwrapsCurlEntityDefinitionRequestEnvelope() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("curl");
        request.setContent("""
                curl -X POST http://127.0.0.1:1157/api/entities/import -H 'Content-Type: application/json' -d '{"format":"yaml","content":"apiVersion: hertzbeat/v1\\nkind: service\\nmetadata:\\n  name: curl-envelope-checkout\\n  namespace: commerce"}'
                """);

        List<Map<String, Object>> records = documentParserService.parseDefinitionRecords(request);

        assertEquals(1, records.size());
        assertEquals("curl-envelope-checkout", metadataName(records.getFirst()));
    }

    @Test
    void parseDefinitionRecordsUnwrapsCurlDataRawEnvelope() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("curl");
        request.setContent("""
                curl -X POST http://127.0.0.1:1157/api/entities/import -H 'Content-Type: application/json' --data-raw '{"format":"yaml","content":"apiVersion: hertzbeat/v1\\nkind: service\\nmetadata:\\n  name: curl-data-raw-checkout\\n  namespace: commerce"}'
                """);

        List<Map<String, Object>> records = documentParserService.parseDefinitionRecords(request);

        assertEquals(1, records.size());
        assertEquals("curl-data-raw-checkout", metadataName(records.getFirst()));
    }

    @Test
    void parseDefinitionRecordsUnwrapsCurlDataRawEnvelopeWithEquals() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("curl");
        request.setContent("""
                curl -X POST http://127.0.0.1:1157/api/entities/import -H 'Content-Type: application/json' --data-raw='{"format":"yaml","content":"apiVersion: hertzbeat/v1\\nkind: service\\nmetadata:\\n  name: curl-data-raw-equals-checkout\\n  namespace: commerce"}'
                """);

        List<Map<String, Object>> records = documentParserService.parseDefinitionRecords(request);

        assertEquals(1, records.size());
        assertEquals("curl-data-raw-equals-checkout", metadataName(records.getFirst()));
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

    @Test
    void parseDefinitionRecordsRejectsUnknownFormatInsteadOfFallingBackToYaml() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("toml");
        request.setContent("kind = service");

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> documentParserService.parseDefinitionRecords(request));

        assertEquals("Entity definition format must be yaml, json, or curl.", exception.getMessage());
    }

    @Test
    void parseDefinitionRecordsRejectsContentAboveCompatibilityLimit() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("yaml");
        request.setContent("a".repeat(EntityDefinitionDocumentParserService.MAX_CONTENT_LENGTH + 1));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> documentParserService.parseDefinitionRecords(request));

        assertEquals("Entity definition content exceeds the supported size.", exception.getMessage());
    }

    @Test
    void parseDefinitionRecordsRejectsBundleAboveCompatibilityDocumentLimit() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("yaml");
        StringBuilder content = new StringBuilder();
        for (int index = 0; index <= EntityDefinitionDocumentParserService.MAX_DEFINITION_RECORDS; index++) {
            content.append("---\nkind: service\nmetadata:\n  name: service-").append(index).append('\n');
        }
        request.setContent(content.toString());

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> documentParserService.parseDefinitionRecords(request));

        assertEquals("Entity definition bundle exceeds the supported document limit.", exception.getMessage());
    }

    @Test
    void parseDefinitionRecordsRejectsDeepJsonWithoutEchoingSensitiveContent() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("json");
        String sensitiveValue = "token-do-not-echo";
        request.setContent("{\"nested\":".repeat(EntityDefinitionDocumentParserService.MAX_NESTING_DEPTH + 1)
                + "{\"credential\":\"" + sensitiveValue + "\"}"
                + "}".repeat(EntityDefinitionDocumentParserService.MAX_NESTING_DEPTH + 1));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> documentParserService.parseDefinitionRecords(request));

        assertEquals("Entity definition exceeds parser safety limits.", exception.getMessage());
        assertFalse(exception.getMessage().contains(sensitiveValue));
    }

    @Test
    void parseDefinitionRecordsRejectsYamlAliasExpansionWithoutEchoingSensitiveContent() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("yaml");
        StringBuilder content = new StringBuilder("kind: service\nsecret: &secret [token-do-not-echo]\nrefs:\n");
        for (int index = 0; index <= EntityDefinitionDocumentParserService.MAX_ALIASES_FOR_COLLECTIONS; index++) {
            content.append("  - *secret\n");
        }
        request.setContent(content.toString());

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> documentParserService.parseDefinitionRecords(request));

        assertEquals("Entity definition content is invalid.", exception.getMessage());
        assertFalse(exception.getMessage().contains("token-do-not-echo"));
    }

    @Test
    void parseDefinitionRecordsReturnsGenericMalformedJsonError() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("json");
        request.setContent("{\"token\":\"token-do-not-echo\", invalid}");

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> documentParserService.parseDefinitionRecords(request));

        assertEquals("Entity definition content is invalid.", exception.getMessage());
        assertFalse(exception.getMessage().contains("token-do-not-echo"));
    }

    @SuppressWarnings("unchecked")
    private String metadataName(Map<String, Object> record) {
        return String.valueOf(((Map<String, Object>) record.get("metadata")).get("name"));
    }
}
