package org.dromara.hertzbeat.manager.dao;

import org.dromara.hertzbeat.common.entity.manager.GeneralConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Component;

/**
 * 消息通知服务端配置Dao
 *
 * <p>该接口继承了JpaRepository和JpaSpecificationExecutor两个接口，提供基本的CRUD操作和规范查询能力。</p>
 *
 * @version 1.0
 * @since 2023/5/9 22:39
 *
 */
@Component
public interface GeneralConfigDao extends JpaRepository<GeneralConfig, Long>, JpaSpecificationExecutor<GeneralConfig> {

    /**
     * 通过类型删除
     *
     * @param type 类型
     * @return 返回受影响的行数
     */
    int deleteByType(Byte type);

    /**
     * 通过类型查询
     *
     * @param type 类型
     * @return 返回查询到的配置信息
     */
    GeneralConfig findByType(Byte type);
}