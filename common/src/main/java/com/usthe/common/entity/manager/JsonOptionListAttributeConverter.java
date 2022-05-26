package com.usthe.common.entity.manager;

import com.google.gson.reflect.TypeToken;
import com.usthe.common.util.GsonUtil;

import javax.persistence.AttributeConverter;
import java.lang.reflect.Type;
import java.util.List;

/**
 * json 互转list paramDefine.Option 对象字段为数据String字段
 *
 *
 */
public class JsonOptionListAttributeConverter implements AttributeConverter<List<ParamDefine.Option>, String> {

    @Override
    public String convertToDatabaseColumn(List<ParamDefine.Option> attribute) {
        return GsonUtil.toJson(attribute);
    }

    @Override
    public List<ParamDefine.Option> convertToEntityAttribute(String dbData) {
        Type type = new TypeToken<List<ParamDefine.Option>>(){}.getType();
        return GsonUtil.fromJson(dbData, type);
    }
}
