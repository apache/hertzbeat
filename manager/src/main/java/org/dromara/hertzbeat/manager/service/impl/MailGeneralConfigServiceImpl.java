package org.dromara.hertzbeat.manager.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.dromara.hertzbeat.manager.dao.GeneralConfigDao;
import org.dromara.hertzbeat.manager.pojo.dto.EmailNoticeSender;
import org.springframework.stereotype.Service;

import java.lang.reflect.Type;


/**
 * MailGeneralConfigServiceImpl类是通用邮件配置服务实现类，继承了AbstractGeneralConfigServiceImpl<NoticeSender>类。
 * MailGeneralConfigServiceImpl class is the implementation of general email configuration service,
 * which inherits the AbstractGeneralConfigServiceImpl<NoticeSender> class.
 *
 * @author zqr10159
 */

@Service
public class MailGeneralConfigServiceImpl extends AbstractGeneralConfigServiceImpl<EmailNoticeSender> {

    /**
     * MailGeneralConfigServiceImpl的构造函数，通过默认构造函数或者反序列化构造(setBeanProps)来创建该类实例。
     * 参数generalConfigDao用于操作数据的dao层，参数objectMapper用于进行对象映射。
     * MailGeneralConfigServiceImpl's constructor creates an instance of this class
     * through the default constructor or deserialization construction (setBeanProps).
     * The parameter generalConfigDao is used for dao layer operation data,
     * and objectMapper is used for object mapping.
     *
     * @param generalConfigDao 数据操作的dao层，供创建该类实例所需
     *                         dao layer operation data, needed to create an instance of this class
     * @param objectMapper     对象映射，供创建该类实例所需
     *                         object mapping , needed to create an instance of this class
     */
    public MailGeneralConfigServiceImpl(GeneralConfigDao generalConfigDao, ObjectMapper objectMapper) {
        super(generalConfigDao, objectMapper);
    }
    
    @Override
    public String type() {
        return "email";
    }
    
    /**
     * 该方法用于获取NoticeSender类型的TypeReference，以供后续处理。
     * This method is used to get the TypeReference of NoticeSender type for subsequent processing.
     *
     * @return NoticeSender类型的TypeReference
     * a TypeReference of NoticeSender type
     */
    @Override
    protected TypeReference<EmailNoticeSender> getTypeReference() {
        return new TypeReference<>() {
            @Override
            public Type getType() {
                return EmailNoticeSender.class;
            }
        };
    }
}
