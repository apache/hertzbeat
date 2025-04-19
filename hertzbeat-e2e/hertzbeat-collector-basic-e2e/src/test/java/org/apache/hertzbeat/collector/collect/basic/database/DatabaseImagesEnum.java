package org.apache.hertzbeat.collector.collect.basic.database;

public enum DatabaseImagesEnum {
    MYSQL("mysql", "8.0.36"),
    POSTGRESQL("postgresql", "15");

    private final String imageName;
    private final String defaultTag;

    DatabaseImagesEnum(String imageName, String defaultTag) {
        this.imageName = imageName;
        this.defaultTag = defaultTag;
    }

    public String getImageName() {
        return imageName;
    }

    public String getDefaultTag() {
        return defaultTag;
    }

    public String getFullImageName() {
        return imageName + ":" + defaultTag;
    }

    public static DatabaseImagesEnum fromImageName(String imageName) {
        for (DatabaseImagesEnum value : values()) {
            if (value.getImageName().equalsIgnoreCase(imageName)) {
                return value;
            }
        }
        throw new IllegalArgumentException("Unknown database image name: " + imageName);
    }

    public static DatabaseImagesEnum fromFullImageName(String fullImageName) {
        for (DatabaseImagesEnum value : values()) {
            if (value.getFullImageName().equalsIgnoreCase(fullImageName)) {
                return value;
            }
        }
        throw new IllegalArgumentException("Unknown full database image name: " + fullImageName);
    }

    @Override
    public String toString() {
        return "DatabaseImageNameEnum{" +
                "imageName='" + imageName + '\'' +
                ", defaultTag='" + defaultTag + '\'' +
                '}';
    }
}
