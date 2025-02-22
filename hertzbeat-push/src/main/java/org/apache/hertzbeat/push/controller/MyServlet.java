package org.apache.hertzbeat.push.controller;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.hertzbeat.common.entity.dto.MetricFamily;
import org.apache.hertzbeat.common.util.OnlineParser;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Map;

@WebServlet(urlPatterns = "/api/push/pushgateway1", loadOnStartup = 1)
public class MyServlet extends HttpServlet {
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        // 获取请求体的 InputStream
        InputStream inputStream = request.getInputStream();

        // 将 InputStream 转换为字符串
        String requestBody = convertStreamToString(inputStream);

        // 打印请求体的原始数据
        System.out.println("Received data: ");
        System.out.println(requestBody);

        // 响应客户端
        response.setContentType("application/json");
        response.getWriter().write("{\"message\": \"Data received successfully\"}");
    }

    // 辅助方法：将 InputStream 转换为字符串
    private String convertStreamToString(InputStream inputStream) throws IOException {
        try (ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[1024];
            int length;
            while ((length = inputStream.read(buffer)) != -1) {
                byteArrayOutputStream.write(buffer, 0, length);
            }
            return byteArrayOutputStream.toString("UTF-8");
        }
    }
}
