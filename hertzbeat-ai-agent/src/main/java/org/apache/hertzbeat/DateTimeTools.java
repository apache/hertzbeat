package org.apache.hertzbeat;

import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.context.i18n.LocaleContextHolder;

public class DateTimeTools {

	@Tool(description = "Get the current date and time in the user's timezone")
	public String getCurrentDateTime() {
		ZonedDateTime localTime = LocalDateTime.now().atZone(LocaleContextHolder.getTimeZone().toZoneId());
		System.out.println("Inside Hertzbeat YAyyyyayy " + localTime);
		return localTime.toString();
	}

	@Tool(description = "Set a user alarm for the given time, provided in ISO-8601 format")
	public void setAlarm(String time) {
		LocalDateTime alarmTime = LocalDateTime.parse(time, DateTimeFormatter.ISO_DATE_TIME);
		System.out.println("Alarm set for: " + alarmTime);
	}
}
