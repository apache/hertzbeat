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

package org.apache.hertzbeat.collector.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link JsonPathParser}
 */
class JsonPathParserTest {

    private static final String JSON_ARRAY = "[{'name': 'tom', 'speed': '433'},{'name': 'lili', 'speed': '543'}]";

    public static final String JSON_OBJECT = """
            {
              "store": {
                "book": [
                  {
                    "category": "reference",
                    "author": "Nigel Rees",
                    "title": "Sayings of the Century",
                    "price": 8.95
                  },
                  {
                    "category": "fiction",
                    "author": "Evelyn Waugh",
                    "title": "Sword of Honour",
                    "price": 12.99
                  },
                  {
                    "category": "fiction",
                    "author": "Herman Melville",
                    "title": "Moby Dick",
                    "isbn": "0-553-21311-3",
                    "price": 8.99
                  },
                  {
                    "category": "fiction",
                    "author": "J. R. R. Tolkien",
                    "title": "The Lord of the Rings",
                    "isbn": "0-395-19395-8",
                    "price": 22.99
                  }
                ],
                "bicycle": {
                  "color": "red",
                  "price": 19.95,
                  "gears": [23, 50],
                  "extra": {"x": 0},
                  "escape": "Esc\\b\\f\\n\\r\\t\\u002A",
                  "nullValue": null
                }
              }
            }
            """;

    @Test
    void parseContentWithJsonPath() {
        // process array
        List<Object> tom = JsonPathParser.parseContentWithJsonPath(JSON_ARRAY, "$[0].name");
        assertNotNull(tom);
        assertEquals("tom", tom.get(0));
        // get json array map
        List<Object> entry = JsonPathParser.parseContentWithJsonPath(JSON_ARRAY, "$[1]");
        assertNotNull(entry);
        entry.forEach(e -> {
            assertInstanceOf(Map.class, e);
            assertEquals("543", ((Map) e).get("speed"));
        });
        // process object
        List<Object> author = JsonPathParser.parseContentWithJsonPath(JSON_OBJECT, "$.store.book[0].author");
        assertNotNull(author);
        assertEquals("Nigel Rees", author.get(0));
        // get json object map
        List<Object> book = JsonPathParser.parseContentWithJsonPath(JSON_OBJECT, "$.store.book[1]");
        assertNotNull(book);
        book.forEach(e -> {
            assertInstanceOf(Map.class, e);
            assertEquals("Sword of Honour", ((Map) e).get("title"));
        });
    }
}
