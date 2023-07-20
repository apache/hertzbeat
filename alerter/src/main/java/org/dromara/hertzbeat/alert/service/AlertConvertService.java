package org.dromara.hertzbeat.alert.service;

/**
 * @author zqr10159
 * Alert Convert Interface
 */
public interface AlertConvertService<T> {
    T convert(String json);
}
