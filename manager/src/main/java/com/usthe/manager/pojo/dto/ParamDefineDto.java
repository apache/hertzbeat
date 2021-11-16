package com.usthe.manager.pojo.dto;

import com.usthe.manager.pojo.entity.ParamDefine;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 参数定义传输实体
 *
 *
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ParamDefineDto {

    private String app;

    private List<ParamDefine> param;
}
