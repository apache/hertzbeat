package org.dromara.hertzbeat.common.util;

/**
 * network util
 * @author ceilzcx
 */
public class NetworkUtil {

    public static final String OS_NAME = System.getProperty("os.name");

    private static final String LINUX = "linux";

    private static final String WINDOWS = "windows";

    private static boolean isLinuxPlatform = false;
    private static boolean isWindowsPlatform = false;

    static {
        if (OS_NAME != null && OS_NAME.toLowerCase().contains(LINUX)) {
            isLinuxPlatform = true;
        }

        if (OS_NAME != null && OS_NAME.toLowerCase().contains(WINDOWS)) {
            isWindowsPlatform = true;
        }
    }

    /**
     * whether the running environment is linux
     * @return is linux platform or not
     */
    public static boolean isLinuxPlatform() {
        return isLinuxPlatform;
    }

    /**
     * whether the running environment is windows
     * @return is windows platform or not
     */
    public static boolean isWindowsPlatform() {
        return isWindowsPlatform;
    }
}
