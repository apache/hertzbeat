package org.dromara.hertzbeat.common.entity.manager;


import com.fasterxml.jackson.core.type.TypeReference;
import org.dromara.hertzbeat.common.util.JsonUtil;

import javax.persistence.AttributeConverter;
import java.util.List;

/**
 * @author:Li Jinming
 * @Description:Json 和list<String>互转
 * @date:2023-06-11
 */


public class JsonStringListAttributeConverter implements AttributeConverter<List<String>, String> {
    @Override
    public String convertToDatabaseColumn(List<String> strings) {
        return JsonUtil.toJson(strings);
    }

    @Override
    public List<String> convertToEntityAttribute(String s) {
        TypeReference<List<String>> typeReference = new TypeReference<>() {};
        return JsonUtil.fromJson(s, typeReference);
    }
}
