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
