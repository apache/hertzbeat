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

package org.apache.hertzbeat.manager.aspect;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.DesensitizedField;
import org.apache.hertzbeat.common.entity.manager.NoticeReceiver;
import org.apache.hertzbeat.common.util.DesensitizedUtil;
import org.apache.hertzbeat.manager.dao.NoticeReceiverDao;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

import javax.annotation.Resource;
import java.lang.reflect.Field;
import java.util.List;

@Aspect
@Component
@Slf4j
public class DesensitizedAspect {
    @Resource
    private NoticeReceiverDao noticeReceiverDao;

    @Around("execution(* org.apache.hertzbeat.manager.service.NoticeConfigService.*(..)))")
    public Object around(ProceedingJoinPoint point) {
        try {
            unDesensitized(point.getArgs());
            Object result = point.proceed();
            return desensitized(result);
        } catch (Throwable e) {
            log.error(e.getMessage(), e);
        }
        return null;
    }

    private void unDesensitized(Object[] args) throws IllegalAccessException {
        if (args == null || args.length == 0) {
            return;
        }
        Long receiverId = null;
        for (Object arg : args) {
            if (arg instanceof NoticeReceiver argNoticeReceiver) {
                receiverId = argNoticeReceiver.getId();
                break;
            }
        }
        if (receiverId == null) {
            return;
        }
        NoticeReceiver noticeReceiver = noticeReceiverDao.findById(receiverId).orElse(null);
        if (noticeReceiver == null) {
            return;
        }
        for (Object arg : args) {
            if (arg instanceof NoticeReceiver argNoticeReceiver) {
                for (Field field : argNoticeReceiver.getClass().getDeclaredFields()) {
                    DesensitizedField annotation = field.getAnnotation(DesensitizedField.class);
                    if (annotation != null) {
                        field.setAccessible(true);
                        DesensitizedUtil.DesensitizedType desensitizedType = annotation.desensitizedType();
                        String desensitizedValue = DesensitizedUtil.desensitize(desensitizedType, field.get(noticeReceiver).toString());
                        if (field.get(argNoticeReceiver) != null && field.get(argNoticeReceiver).equals(desensitizedValue)) {
                            field.set(argNoticeReceiver, field.get(noticeReceiver));
                        }
                    }
                }
            }
        }
    }

    private Object desensitized(Object result) throws IllegalAccessException {
        if (result == null) {
            return null;
        }
        if (result instanceof List<?>) {
            for (Object item : ((List<?>) result)) {
                desensitizedField(item);
            }
        } else {
            desensitizedField(result);
        }
        return result;
    }

    private void desensitizedField(Object result) throws IllegalAccessException {
        for (Field field : result.getClass().getDeclaredFields()) {
            DesensitizedField annotation = field.getAnnotation(DesensitizedField.class);
            if (annotation != null) {
                DesensitizedUtil.DesensitizedType desensitizedType = annotation.desensitizedType();
                field.setAccessible(true);
                field.set(result, DesensitizedUtil.desensitize(desensitizedType, field.get(result).toString()));
            }
        }
    }

}
