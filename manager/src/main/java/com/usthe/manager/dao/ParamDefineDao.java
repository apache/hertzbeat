package com.usthe.manager.dao;

import com.usthe.manager.pojo.entity.ParamDefine;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * ParamDefine数据库操作
 * @author tomsun28
 * @date 2021/11/14 11:27
 */
public interface ParamDefineDao extends JpaRepository<ParamDefine, Long> {

}
