package com.usthe.common.entity.manager;

import com.usthe.common.util.GsonUtil;

import javax.persistence.AttributeConverter;
import java.util.List;

/**
 * json 互转list Byte 对象字段为数据String字段
 * @author tom
 * @date 2021/12/4 07:54
 */
public class JsonByteListAttributeConverter implements AttributeConverter<List<Byte>, String> {

    @Override
    public String convertToDatabaseColumn(List<Byte> attribute) {
        return GsonUtil.toJson(attribute);
    }

    @Override
    public List<Byte> convertToEntityAttribute(String dbData) {
        return GsonUtil.fromJson(dbData, List.class);
    }
}
