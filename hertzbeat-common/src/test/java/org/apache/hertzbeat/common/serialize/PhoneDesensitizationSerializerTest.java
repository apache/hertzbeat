package org.apache.hertzbeat.common.serialize;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;
import org.apache.hertzbeat.common.cache.CacheFactory;
import org.apache.hertzbeat.common.cache.CommonCacheService;
import org.apache.hertzbeat.common.entity.dto.vo.NoticeReceiverVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PhoneDesensitizationSerializerTest {

    private PhoneDesensitizationSerializer phoneDesensitizationSerializer;

    @BeforeEach
    void setUp() {
        phoneDesensitizationSerializer = new PhoneDesensitizationSerializer();
    }

    @Test
    public void test() throws JsonProcessingException {
        NoticeReceiverVO noticeReceiver = new NoticeReceiverVO();
        noticeReceiver.setId(1L);
        noticeReceiver.setPhone("12345678910");

        ObjectMapper objectMapper = new ObjectMapper();
        SimpleModule simpleModule = new SimpleModule();
        simpleModule.addSerializer(String.class,phoneDesensitizationSerializer);

        objectMapper.registerModule(simpleModule);

        String jsonString = objectMapper.writeValueAsString(noticeReceiver);
        NoticeReceiverVO noticeReceiverVO = objectMapper.readValue(jsonString, NoticeReceiverVO.class);

        CommonCacheService<String, Object> desensitizationMapCache = CacheFactory.getDesensitizationMapCache();

        assertEquals(noticeReceiver.getPhone(),desensitizationMapCache.get(noticeReceiverVO.getId()+"_"+noticeReceiverVO.getPhone()));
    }
}