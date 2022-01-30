package com.usthe.common.entity.manager;

import com.usthe.common.util.GsonUtil;

import javax.persistence.AttributeConverter;
import java.util.List;

/**
 * json 互转map对象字段为数据String字段
 * @author tom
 * @date 2021/12/4 07:54
 */
public class JsonOptionListAttributeConverter implements AttributeConverter<List<ParamDefine.Option>, String> {

    @Override
    public String convertToDatabaseColumn(List<ParamDefine.Option> attribute) {
        return GsonUtil.toJson(attribute);

    }

    @Override
    public List<ParamDefine.Option> convertToEntityAttribute(String dbData) {
        return GsonUtil.fromJson(dbData, List.class);
    }
}
