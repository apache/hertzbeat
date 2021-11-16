package com.usthe.common.util;

import com.google.protobuf.Message;
import com.google.protobuf.MessageOrBuilder;
import com.google.protobuf.util.JsonFormat;
import lombok.extern.slf4j.Slf4j;

/**
 * protobuf json相互转换工具类
 *
 *
 */
@Slf4j
public class ProtoJsonUtil {

    /**
     * protobuf 转 json
     * @param proto protobuf
     * @return json
     */
    public static String toJsonStr(Message proto) {
        try {
            return JsonFormat.printer().print(proto);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return null;
        }
    }

    /**
     * json转protobuf
     * @param json json str
     * @param builder proto instance builder
     * @return protobuf
     */
    public static Message toProtobuf(String json, Message.Builder builder) {
        try {
            JsonFormat.parser().merge(json, builder);
            return builder.build();
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return null;
        }
    }
}
