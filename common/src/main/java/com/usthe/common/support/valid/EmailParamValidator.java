package com.usthe.common.support.valid;

import com.usthe.common.util.CommonUtil;

import javax.validation.ConstraintValidator;
import javax.validation.ConstraintValidatorContext;

/**
 * email注解数据自定义校验器
 *
 *
 */
public class EmailParamValidator implements ConstraintValidator<EmailValid, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        // 判断value是否满足ipv4 ipv5 域名 格式
        return CommonUtil.validateEmail(value);
    }
}
