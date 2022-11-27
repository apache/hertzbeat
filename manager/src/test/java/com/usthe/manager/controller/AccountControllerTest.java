package com.usthe.manager.controller;

import com.usthe.common.util.CommonConstants;
import com.usthe.common.util.GsonUtil;
import com.usthe.manager.pojo.dto.LoginDto;
import com.usthe.sureness.util.JsonWebTokenUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test case for {@link AccountController}
 */
@ExtendWith(MockitoExtension.class)
class AccountControllerTest {

    private MockMvc mockMvc;

    @InjectMocks
    private AccountController accountController;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(accountController).build();
    }

    @Test
    void authGetToken() throws Exception {
        JsonWebTokenUtil.setDefaultSecretKey("dKhaX0csgOCTlCxq20yhmUea6H6JIpSE2Rwp"
                + "CyaFv0bwq2Eik0jdrKUtsA6bx3sDJeFV643R"
                + "LnfKefTjsIfJLBa2YkhEqEGtcHDTNe4CU6+9"
                + "dKhaX0csgOCTlCxq20yhmUea6H6JIpSE2Rwp");
        LoginDto loginDto = LoginDto.builder()
                .identifier("admin")
                .credential("hertzbeat")
                .build();
        this.mockMvc.perform(MockMvcRequestBuilders.post("/api/account/auth/form")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(GsonUtil.toJson(loginDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.token").exists())
                .andReturn();
        loginDto.setCredential("wrong_credential");
        this.mockMvc.perform(MockMvcRequestBuilders.post("/api/account/auth/form")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(GsonUtil.toJson(loginDto)))
                .andExpect(jsonPath("$.code").value((int) CommonConstants.MONITOR_LOGIN_FAILED_CODE))
                .andReturn();
    }

    @Test
    void refreshToken() throws Exception {
        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/account/auth/refresh/{refreshToken}",
                        "123456"))
                .andExpect(jsonPath("$.code").value((int) CommonConstants.MONITOR_LOGIN_FAILED_CODE))
                .andReturn();
    }
}