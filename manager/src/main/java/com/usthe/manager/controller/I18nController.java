package com.usthe.manager.controller;

import com.usthe.common.entity.dto.Message;
import com.usthe.manager.service.AppService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Internationalization I 18 N
 * 国际化I18N
 *
 * @author tom
 * @date 2021/12/4 21:40
 */
@Api(tags = "en:I18N API | I18N Internationalization Resource API,zh: I18N API | I18N国际化资源API")
@RestController
@RequestMapping(path = "/i18n", produces = {APPLICATION_JSON_VALUE})
public class I18nController {

    @Autowired
    private AppService appService;

    @GetMapping("/{lang}")
    @ApiOperation(value = "Query total i 18 n internationalized text resources", notes = "查询总的i18n国际化文本资源")
    public ResponseEntity<Message<Map<String, String>>> queryI18n(
            @ApiParam(value = "en: language type,zh: 语言类型", example = "zh-CN", defaultValue = "zh-CN")
            @PathVariable(name = "lang", required = false) String lang) {
        if (lang == null || "".equals(lang)) {
            lang = "zh-CN";
        }
        lang = "zh-cn".equalsIgnoreCase(lang) ? "zh-CN" : lang;
        lang = "en-us".equalsIgnoreCase(lang) ? "en-US" : lang;
        Map<String, String> i18nResource = appService.getI18nResources(lang);
        return ResponseEntity.ok(new Message<>(i18nResource));
    }
}
