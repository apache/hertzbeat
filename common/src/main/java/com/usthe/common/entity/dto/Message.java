package com.usthe.common.entity.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Unified message structure definition for front and back ends
 *
 * {
 *   data:{....},
 *   msg: message,
 *   code: 3432
 * }
 *
 *
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class Message<T> {

    /**
     * message body data
     */
    private T data;

    /**
     * exception message when error happen or success message
     */
    private String msg;

    /**
     * response code, not http code
     */
    private Integer code;

}
