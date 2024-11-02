package org.apache.hertzbeat.common.serialize;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import org.apache.hertzbeat.common.util.DesensitizedUtil;

import java.io.IOException;

/**
 * desensitization Serializes sensitive field
 */
public class DesensitizeSerializer {

    private DesensitizeSerializer() {}

    /**
     * desensitization Serializes mobile phone field
     */
    public static class PhoneSerializer extends JsonSerializer<String> {

        @Override
        public void serialize(String s, JsonGenerator jsonGenerator, SerializerProvider serializerProvider) throws IOException {
            jsonGenerator.writeString(DesensitizedUtil.desensitized(s, DesensitizedUtil.DesensitizedType.MOBILE_PHONE));
        }
    }

    /**
     * desensitization Serializes email field
     */
    public static class EmailSerializer extends JsonSerializer<String> {

        @Override
        public void serialize(String s, JsonGenerator jsonGenerator, SerializerProvider serializerProvider) throws IOException {
            jsonGenerator.writeString(DesensitizedUtil.desensitized(s, DesensitizedUtil.DesensitizedType.EMAIL));
        }
    }

    /**
     * desensitization Serializes password field
     */
    public static class PasswordSerializer extends JsonSerializer<String> {

        @Override
        public void serialize(String s, JsonGenerator jsonGenerator, SerializerProvider serializerProvider) throws IOException {
            jsonGenerator.writeString(DesensitizedUtil.desensitized(s, DesensitizedUtil.DesensitizedType.PASSWORD));
        }
    }
}
