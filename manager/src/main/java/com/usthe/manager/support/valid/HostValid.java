package com.usthe.manager.support.valid;

import javax.validation.Constraint;
import javax.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

/**
 * host注解数据自定义校验器注解
 *
 *
 */
@Target({ FIELD, PARAMETER })
@Retention(RUNTIME)
@Documented
@Constraint(validatedBy = HostParamValidator.class)
public @interface HostValid {

    String message() default "Host value is invalid,must ipv4, ipv6 or domain";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
