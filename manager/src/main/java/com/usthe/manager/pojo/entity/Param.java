package com.usthe.manager.pojo.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;
import java.time.LocalDateTime;

/**
 * 监控参数值
 * @author tomsun28
 * @date 2021/11/13 22:19
 */
@Entity
@Table(name = "param")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class Param {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 监控ID
     */
    private Long monitorId;

    /**
     * 参数字段标识符
     */
    private String field;

    /**
     * 参数值
     */
    private String value;

    /**
     * 参数类型 0:数字 1:字符串 2:加密串
     */
    private byte type;

    /**
     * 记录创建时间
     */
    private LocalDateTime gmtCreate;

    /**
     * 记录最新修改时间
     */
    private LocalDateTime gmtUpdate;

}
