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

package org.dromara.hertzbeat.common.util;

import com.fasterxml.jackson.core.type.TypeReference;
import org.dromara.hertzbeat.common.entity.manager.TagItem;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

/**
 * Test case for {@link JsonUtil}
 */
class JsonUtilTest {

    @BeforeEach
    void setUp() {
    }

    @Test
    void toJson() {
        List<TagItem> tagList = new ArrayList<>(4);
        TagItem proTag = new TagItem("test", "pro");
        tagList.add(proTag);
        tagList.add(new TagItem("test", "dev"));
        System.out.println(JsonUtil.toJson(tagList));
    }

    @Test
    void fromJson() {
    }

    @Test
    void testFromJson() {
        String jsonStr = "[{\"name\":\"test\",\"value\":\"pro\"},{\"name\":\"test\",\"value\":\"dev\"}]";
        List<TagItem> tagItems = JsonUtil.fromJson(jsonStr, new TypeReference<List<TagItem>>() {
        });
        System.out.println(tagItems);
    }

    @Test
    void testFromJson1() {
    }
}
