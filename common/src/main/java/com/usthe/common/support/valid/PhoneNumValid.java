package com.usthe.common.support.valid;

import javax.validation.Constraint;
import javax.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

/**
 * phoneNum注解数据自定义校验器注解
 * @author tomsun28
 * @date 2021/11/17 19:42
 */
@Target({ FIELD, PARAMETER })
@Retention(RUNTIME)
@Documented
@Constraint(validatedBy = PhoneNumParamValidator.class)
public @interface PhoneNumValid {

    String message() default "Phone num value is invalid";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
