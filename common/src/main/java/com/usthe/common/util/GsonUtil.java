package com.usthe.common.util;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import io.etcd.jetcd.ByteSequence;

import javax.annotation.concurrent.ThreadSafe;
import java.nio.charset.StandardCharsets;

/**
 * gson 工具类
 * @author tomsun28
 * @date 2021/10/16 20:49
 */
@ThreadSafe
public class GsonUtil {

    private static Gson gson;

    static {
        gson = new GsonBuilder().enableComplexMapKeySerialization()
                .serializeNulls()
                .create();
    }

    public static String toJson(Object source) {
        return gson.toJson(source);
    }

    public static <T> T fromJson(String jsonStr, Class<T> clazz) {
        return gson.fromJson(jsonStr, clazz);
    }

    public static <T> T fromJson(ByteSequence byteSequence, Class<T> clazz) {
        if (byteSequence == null || byteSequence.isEmpty()) {
            return null;
        }
        return gson.fromJson(byteSequence.toString(StandardCharsets.UTF_8), clazz);
    }

}
