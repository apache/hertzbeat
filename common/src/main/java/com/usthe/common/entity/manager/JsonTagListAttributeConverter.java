package com.usthe.common.entity.manager;

import com.google.gson.reflect.TypeToken;
import com.usthe.common.util.GsonUtil;

import javax.persistence.AttributeConverter;
import java.lang.reflect.Type;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * json 互转 tag list 对象字段为数据String字段
 *
 *
 */
public class JsonTagListAttributeConverter implements AttributeConverter<List<NoticeRule.TagItem>, String> {

    @Override
    public String convertToDatabaseColumn(List<NoticeRule.TagItem> attribute) {
        return GsonUtil.toJson(attribute);
    }

    @Override
    public List<NoticeRule.TagItem> convertToEntityAttribute(String dbData) {
        try {
            Type type = new TypeToken<List<NoticeRule.TagItem>>(){}.getType();
            return GsonUtil.fromJson(dbData, type);
        } catch (Exception e) {
            // history data handler
            Type type = new TypeToken<Map<String, String>>(){}.getType();
            Map<String, String> map = GsonUtil.fromJson(dbData, type);
            return map.entrySet().stream().map(entry -> new NoticeRule.TagItem(entry.getKey(), entry.getValue())).collect(Collectors.toList());
        }
    }
}
