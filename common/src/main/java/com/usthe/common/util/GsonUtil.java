/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.usthe.common.util;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonElement;
import io.etcd.jetcd.ByteSequence;

import javax.annotation.concurrent.ThreadSafe;
import java.lang.reflect.Type;
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

    public static <T> T fromJson(String jsonStr, Type type) {
        return gson.fromJson(jsonStr, type);
    }

    public static <T> T fromJson(JsonElement element, Class<T> clazz) {
        return gson.fromJson(element, clazz);
    }

    public static <T> T fromJson(ByteSequence byteSequence, Class<T> clazz) {
        if (byteSequence == null || byteSequence.isEmpty()) {
            return null;
        }
        return gson.fromJson(byteSequence.toString(StandardCharsets.UTF_8), clazz);
    }

    public static JsonElement toJsonTree(Object source) {
        return gson.toJsonTree(source);
    }

}
