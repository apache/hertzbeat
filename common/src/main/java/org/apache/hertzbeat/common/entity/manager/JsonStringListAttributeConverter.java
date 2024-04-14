package org.apache.hertzbeat.common.entity.manager;

import com.fasterxml.jackson.core.type.TypeReference;
import jakarta.persistence.AttributeConverter;
import org.apache.hertzbeat.common.util.JsonUtil;

import java.util.List;


/**
 * Convert the list of strings to a JSON string
 */
public class JsonStringListAttributeConverter implements AttributeConverter<List<String>, String> {
    @Override
    public String convertToDatabaseColumn(List<String> attribute) {
        return JsonUtil.toJson(attribute);

    }

    @Override
    public List<String> convertToEntityAttribute(String dbData) {
        TypeReference<List<String>> typeReference = new TypeReference<>() {};
        List<String> stringList = JsonUtil.fromJson(dbData, typeReference);
        if (stringList == null && !dbData.isEmpty()) {
            return List.of(dbData);
        }else return stringList;
    }
}
