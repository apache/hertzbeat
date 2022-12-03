package com.usthe.collector.dispatch.unit;

/**
 * the enum of data size
 * 数据空间大小的枚举类
 * @author ceilzcx
 * @since 2022/10/03
 */
public enum DataUnit {
    /**
     * byte
     */
    B("B", 1),
    /**
     * kilobyte
     */
    KB("KB", 1024),
    /**
     * kilobyte
     */
    K("K", 1024),
    /**
     * kilobyte
     */
    KI("KI", 1024),
    /**
     * megabyte
     * 1024 * 1024
     */
    MB("MB", 1_048_576),
    /**
     * megabyte
     * 1024 * 1024
     */
    MI("MI", 1_048_576),
    /**
     * megabyte
     * 1024 * 1024
     */
    M("M", 1_048_576),
    /**
     * gigabyte
     * 1024 * 1024 * 1024
     */
    GB("GB", 1_073_741_824),
    /**
     * gigabyte
     * 1024 * 1024 * 1024
     */
    GI("GI", 1_073_741_824),
    /**
     * gigabyte
     * 1024 * 1024 * 1024
     */
    G("G", 1_073_741_824);

    private final String unit;
    private final long scale;

    private DataUnit(String unit, long scale) {
        this.unit = unit;
        this.scale = scale;
    }

    public String getUnit() {
        return unit;
    }

    public long getScale() {
        return scale;
    }
}
