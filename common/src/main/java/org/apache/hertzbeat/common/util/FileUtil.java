package org.apache.hertzbeat.common.util;

import java.util.Map;

import org.apache.hertzbeat.common.constants.ExportFileConstants;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

/**
 * File utils.
 */

public final class FileUtil {

	private FileUtil() {
	}

	private static final Map<String, String> fileTypes;

	static {
		fileTypes = Map.of(
				ExportFileConstants.JsonFile.FILE_SUFFIX, ExportFileConstants.JsonFile.TYPE,
				ExportFileConstants.YamlFile.FILE_SUFFIX, ExportFileConstants.YamlFile.TYPE,
				ExportFileConstants.ExcelFile.FILE_SUFFIX, ExportFileConstants.ExcelFile.TYPE
		);
	}

	/**
	 * Get file name.
	 * @param file {@link MultipartFile}
	 * @return file name
	 */
	public static String getFileName(MultipartFile file) {

		var fileName = file.getOriginalFilename();
		if (!StringUtils.hasText(fileName)) {
			return "";
		}
		return fileName;
	}

	/**
	 * Get file type.
	 * @param file {@link MultipartFile}
	 * @return file type
	 */
	public static String getFileType(MultipartFile file) {

		var fileName = getFileName(file);

		if (!StringUtils.hasText(fileName)) {
			return "";
		}

		var dotIndex = fileName.lastIndexOf('.');
		if (dotIndex == -1 || dotIndex == fileName.length() - 1) {
			return "";
		}
		var fileNameExtension = fileName.substring(dotIndex);

		return fileTypes.get(fileNameExtension);
	}

}
