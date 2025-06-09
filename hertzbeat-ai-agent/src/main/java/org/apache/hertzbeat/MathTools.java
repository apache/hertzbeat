package org.apache.hertzbeat;

import org.springframework.ai.tool.annotation.Tool;

public class MathTools {

	@Tool(description = "Adds two numbers")
	public int sumNumbers(int number1, int number2) {
		return number1 + number2;
	}

	@Tool(description = "Multiplies two numbers")
	public int multiplyNumbers(int number1, int number2) {
		return number1 * number2;
	}

}
