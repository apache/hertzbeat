package org.apache.hertzbeat.templatehub.exception;

public class HertzbeatTemplateHubException extends RuntimeException {

    private String errMsg;

    public HertzbeatTemplateHubException() {
    }

    public HertzbeatTemplateHubException(String errMsg) {
        super(errMsg);
        this.errMsg = errMsg;
    }

//    public static void HertzbeatTemplateHubThrow(String errMsg) {
//        throw new HertzbeatTemplateHubException(errMsg);
//    }
//
//    public static void HertzbeatTemplateHubThrow(CommonError error) {
//        throw new HertzbeatTemplateHubException(error.getErrMsg());
//    }
}
