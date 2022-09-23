package com.usthe.manager.component.alerter.impl;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * common robot http response entity
 *
 *
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class CommonRobotNotifyResp {

    @JsonProperty(value = "errcode")
    private Integer errCode;

    @JsonProperty(value = "errmsg")
    private String errMsg;

    private Integer code;

    private String msg;
}
