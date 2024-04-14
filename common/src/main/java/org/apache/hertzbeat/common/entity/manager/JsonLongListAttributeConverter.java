package org.apache.hertzbeat.common.entity.manager;

import com.fasterxml.jackson.core.type.TypeReference;
import jakarta.persistence.AttributeConverter;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.util.JsonUtil;
import java.util.List;


/**
 * json str to id list
 */

public class JsonLongListAttributeConverter implements AttributeConverter<List<Long>, String> {
    @Override
    public String convertToDatabaseColumn(List<Long> attribute) {
        return JsonUtil.toJson(attribute);

    }

    @Override
    public List<Long> convertToEntityAttribute(String dbData) {
        TypeReference<List<Long>> typeReference = new TypeReference<>() {};
        List<Long> longList = JsonUtil.fromJson(dbData, typeReference);
        if (longList == null && !dbData.isEmpty()) {
            if (StringUtils.isNumeric(dbData)){
                return List.of(Long.parseLong(dbData));
            }
            else throw new NumberFormatException("String convert to Long error");
        }else return longList;
    }
}
