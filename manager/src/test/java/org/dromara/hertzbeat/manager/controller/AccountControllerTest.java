package org.dromara.hertzbeat.manager.controller;

import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.manager.dao.UserAccountDao;
import org.dromara.hertzbeat.manager.pojo.dto.UserAccount;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.dromara.hertzbeat.manager.pojo.dto.LoginDto;
import com.usthe.sureness.util.JsonWebTokenUtil;
import org.dromara.hertzbeat.manager.service.UserService;
import org.dromara.hertzbeat.manager.support.JwtTokenHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.dromara.hertzbeat.common.constants.CommonConstants.PERIOD_TIME;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
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

    @Mock
    private UserService userService;
    @Mock
    private UserAccountDao userAccountDao;

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
                        .content(JsonUtil.toJson(loginDto)))
                .andExpect(status().isOk())
                .andReturn();
        loginDto.setCredential("wrong_credential");
        this.mockMvc.perform(MockMvcRequestBuilders.post("/api/account/auth/form")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(loginDto)))
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


    @Test
    void issueToken() throws Exception {
        JsonWebTokenUtil.setDefaultSecretKey("dKhaX0csgOCTlCxq20yhmUea6H6JIpSE2Rwp"
                + "CyaFv0bwq2Eik0jdrKUtsA6bx3sDJeFV643R"
                + "LnfKefTjsIfJLBa2YkhEqEGtcHDTNe4CU6+9"
                + "dKhaX0csgOCTlCxq20yhmUea6H6JIpSE2Rwp");

        UserAccount originAccount= UserAccount.builder().accountName("admin")
                .password("admin")
                .disabledAccount(false)
                .excessiveAttempts(false)
                .identifier("admin")
                .id(1L)
                .salt(null)
                .ownRoles(Stream.of(new String[]{"admin","guest"}).collect(Collectors.toList()))
                .build();

        LoginDto loginDto = LoginDto.builder()
                .identifier("admin")
                .credential("admin")
                .build();
        Mockito.when(userService.findUser("admin")).thenReturn(originAccount);
        String token = JwtTokenHelper.issueJwtToken(originAccount, "admin", PERIOD_TIME).get("token");
        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/account/auth/issue/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(loginDto))
                        .param("tokenExpireTime", new String[]{"200"}))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }
}
