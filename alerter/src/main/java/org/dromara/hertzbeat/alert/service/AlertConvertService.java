package org.dromara.hertzbeat.alert.service;

public interface AlertConvertService<T> {
    T convert(String json);
}
