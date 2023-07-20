package org.dromara.hertzbeat.alert.service;

/**
 * @author zqr10159
 * 告警转换接口
 * @param <T>
 */
public interface AlertConvertService<T> {
    T convert(String json);
}
