package org.dromara.hertzbeat.alert.service;

/**
 * Alert Convert Interface.
 *
 * @param <T> the type of object to convert the JSON into
 */
public interface AlertConvertService<T> {
    /**
     * Alert Convert Method.
     *
     * @param json the JSON string to convert
     * @return the converted object of type T
     */
    T convert(String json);
}
