package com.usthe.common.entity.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import static com.usthe.common.util.CommonConstants.SUCCESS_CODE;

/**
 * Unified message structure definition for front and back ends
 *
 * {
 *   data:{....},
 *   msg: message,
 *   code: 3432
 * }
 * @author tomsun28
 * @date 23:48 2019/08/01
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "公共消息包装")
public class Message<T> {

    /**
     * message body data
     */
    @ApiModelProperty(value = "响应数据", position = 0)
    private T data;

    /**
     * exception message when error happen or success message
     */
    @ApiModelProperty(value = "携带消息", position = 1)
    private String msg;

    /**
     * response code, not http code
     */
    @ApiModelProperty(value = "携带编码", position = 2)
    private byte code = SUCCESS_CODE;

    public Message(String msg) {
        this.msg = msg;
    }

    public Message(byte code, String msg) {
        this.code = code;
        this.msg = msg;
    }

    public Message(T data) {
        this.data = data;
    }
}
