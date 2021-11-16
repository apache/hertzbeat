package com.usthe.common.util;

import com.google.protobuf.Message;
import com.google.protobuf.util.JsonFormat;
import lombok.extern.slf4j.Slf4j;

/**
 * protobuf json相互转换工具类
 * @author tomsun28
 * @date 2021/11/16 12:16
 */
@Slf4j
public class ProtoJsonUtil {

    private static final JsonFormat.Printer PRINTER = JsonFormat.printer();
    private static final JsonFormat.Parser PARSER = JsonFormat.parser();

    /**
     * protobuf 转 json
     * @param proto protobuf
     * @return json
     */
    public static String toJsonStr(Message proto) {
        try {
            return PRINTER.print(proto);
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
            PARSER.merge(json, builder);
            return builder.build();
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return null;
        }
    }
}
