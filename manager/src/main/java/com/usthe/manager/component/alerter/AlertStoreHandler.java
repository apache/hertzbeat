package com.usthe.manager.component.alerter;

import com.usthe.common.entity.alerter.Alert;

/**
 * 报警持久化
 *
 * @author <a href="mailto:Musk.Chen@fanruan.com">Musk.Chen</a>
 * @since 2022/4/24
 */
public interface AlertStoreHandler {

    /**
     * 持久化报警记录
     *
     * @param alert 报警
     */
    void store(Alert alert);
}
