package org.apache.hertzbeat.common.entity.manager;

import com.fasterxml.jackson.core.type.TypeReference;
import jakarta.persistence.AttributeConverter;
import org.apache.hertzbeat.common.util.JsonUtil;
import java.util.List;

/**
 * json str to id list
 */
public class JsonIdListAttributeConverter implements AttributeConverter<List<Long>, String> {
    @Override
    public String convertToDatabaseColumn(List<Long> attribute) {
        return JsonUtil.toJson(attribute);

    }

    @Override
    public List<Long> convertToEntityAttribute(String dbData) {
        TypeReference<List<Long>> typeReference = new TypeReference<>() {};
        return JsonUtil.fromJson(dbData, typeReference);
    }
}
