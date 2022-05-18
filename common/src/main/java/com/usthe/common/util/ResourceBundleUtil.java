package com.usthe.common.util;

import com.usthe.common.support.ResourceBundleUtf8Control;
import lombok.extern.slf4j.Slf4j;

import java.util.Locale;
import java.util.MissingResourceException;
import java.util.ResourceBundle;

/**
 * i18n ResourceBundle util
 *
 *
 */
@Slf4j
public class ResourceBundleUtil {

    /**
     * 根据bundle name 获取 resource bundle
     * @param bundleName bundle name
     * @return resource bundle
     */
    public static ResourceBundle getBundle(String bundleName) {
        try {
            return ResourceBundle.getBundle(bundleName, new ResourceBundleUtf8Control());
        } catch (MissingResourceException resourceException) {
            return ResourceBundle.getBundle(bundleName, Locale.US, new ResourceBundleUtf8Control());
        }
    }

}
