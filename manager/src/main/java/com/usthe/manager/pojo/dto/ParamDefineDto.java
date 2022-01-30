package com.usthe.manager.pojo.dto;

import com.usthe.common.entity.manager.ParamDefine;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 参数定义传输实体
 * @author tomsun28
 * @date 2021/11/16 16:50
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ParamDefineDto {

    private String app;

    private List<ParamDefine> param;
}
