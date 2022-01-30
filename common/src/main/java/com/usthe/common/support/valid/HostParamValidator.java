package com.usthe.common.support.valid;

import com.usthe.common.util.IpDomainUtil;

import javax.validation.ConstraintValidator;
import javax.validation.ConstraintValidatorContext;

/**
 * host注解数据自定义校验器
 * @author tomsun28
 * @date 2021/11/17 19:44
 */
public class HostParamValidator implements ConstraintValidator<HostValid, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        // 判断value是否满足ipv4 ipv5 域名 格式
        return IpDomainUtil.validateIpDomain(value);
    }
}
