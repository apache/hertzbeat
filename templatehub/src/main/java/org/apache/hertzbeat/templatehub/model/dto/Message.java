package org.apache.hertzbeat.templatehub.model.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.ToString;
import org.apache.hertzbeat.templatehub.constants.CommonConstants;

/**
 * Unified message structure definition for front and back ends
 * <p>
 * {
 * data:{....},
 * msg: message,
 * code: 3432
 * }
 */

@Data
@ToString
@AllArgsConstructor
public class Message<T> {

    /**
     * response code, not http code
     */
    @Schema(title = "Response Code")
    private byte code = CommonConstants.SUCCESS_CODE;

    /**
     * exception message when error happen or success message
     */
    @Schema(title = "Other Message")
    private String msg;

    /**
     * message body data
     */
    @Schema(description = "Response Data")
    private T data;

    public static <T> Message<T> success() {
        return new Message<>();
    }

    public static <T> Message<T> success(String msg) {
        return new Message<>(msg);
    }

    public static <T> Message<T> fail(byte code, String msg) {
        return new Message<>(code, msg);
    }

    public static <T> Message<T> success(T data) {
        return new Message<>(data);
    }

    public static <T> Message<T> successWithData(T data) {
        return new Message<>(data);
    }

    private Message() {
    }

    private Message(String msg) {
        this.msg = msg;
    }

    private Message(byte code, String msg) {
        this.code = code;
        this.msg = msg;
    }

    private Message(T data) {
        this.data = data;
    }

}
