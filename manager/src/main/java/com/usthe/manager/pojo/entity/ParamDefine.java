package com.usthe.manager.pojo.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;
import java.time.LocalDateTime;

/**
 * 监控参数定义
 * @author tomsun28
 * @date 2021/11/13 21:49
 */
@Entity
@Table(name = "param_define")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ParamDefine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 监控应用类型名称
     */
    private String app;

    /**
     * 参数字段对外显示名称
     */
    private String name;

    /**
     * 参数字段标识符
     */
    private String field;

    /**
     * 字段类型,样式(大部分映射input标签type属性)
     */
    private String type;

    /**
     * 当type为number时,用range表示范围 eg: 0-233
     */
    @Column(name = "param_range")
    private String range;

    /**
     * 当type为text时,用limit表示字符串限制大小.最大255
     */
    @Column(name = "param_limit")
    private short limit;

    /**
     * 当type为radio单选框,checkbox复选框时,option表示可选项值列表
     * eg: param3,param4,param5
     */
    @Column(name = "param_option")
    private String option;

    /**
     * 此条记录创建者
     */
    private String creator;

    /**
     * 此条记录最新修改者
     */
    private String modifier;

    /**
     * 记录创建时间
     */
    private LocalDateTime gmtCreate;

    /**
     * 记录最新修改时间
     */
    private LocalDateTime gmtUpdate;
}
