package com.usthe.alert.controller;

import com.usthe.alert.service.AlertDefineService;
import com.usthe.common.entity.alerter.AlertDefine;
import com.usthe.common.util.CommonConstants;
import com.usthe.common.util.GsonUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatcher;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Test case for {@link AlertDefinesController}
 * 测试mock处的数据是否正确，测试返回的数据格式是否正确
 *
 * @author 落阳
 */
@ExtendWith(MockitoExtension.class)
class AlertDefinesControllerTest {

    private MockMvc mockMvc;

    @InjectMocks
    private AlertDefinesController alertDefinesController;

    @Mock
    AlertDefineService alertDefineService;

    // 参数如下，为了避免默认值干扰，默认值已经被替换
    List<Long> ids = Stream.of(6565463543L, 6565463544L).collect(Collectors.toList());
    Byte priority = new Byte("1");
    String sort = "gmtCreate";
    String order = "asc";
    Integer pageIndex = 1;
    Integer pageSize = 7;

    // 参数集合
    Map<String, Object> content = new HashMap<String, Object>();

    // 用于mock的对象
    PageRequest pageRequest;

    // 由于specification被使用于动态代理，所以无法mock
    // 缺失的调试参数是ids、priority
    // 缺失部分已经通过手动输出测试

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(alertDefinesController).build();

        // 配置测试内容
        content.put("ids", ids);
        content.put("priority", priority);
        content.put("sort", sort);
        content.put("order", order);
        content.put("pageIndex", pageIndex);
        content.put("pageSize", pageSize);

        // mock的pageRequest
        Sort sortExp = Sort.by(new Sort.Order(Sort.Direction.fromString(content.get("order").toString()), content.get("sort").toString()));
        pageRequest = PageRequest.of(((Integer) content.get("pageIndex")).intValue(), ((Integer) content.get("pageSize")).intValue(), sortExp);
    }

    @Test
    void getAlertDefines() throws Exception {
        // 测试mock正确性
        // 虽然无法mock对象，但是可以用class文件去存根
        Mockito.when(alertDefineService.getAlertDefines(Mockito.any(Specification.class), Mockito.argThat(new ArgumentMatcher<PageRequest>() {
            @Override
            public boolean matches(PageRequest pageRequestMidden) {
                // 看源码有三个方法要对比，分别是getPageNumber()、getPageSize()、getSort()
                if(pageRequestMidden.getPageSize() == pageRequest.getPageSize() &&
                        pageRequestMidden.getPageNumber() == pageRequest.getPageNumber() &&
                        pageRequestMidden.getSort().equals(pageRequest.getSort())) {
                    return true;
                }
                return false;
            }
        }))).thenReturn(new PageImpl<AlertDefine>(new ArrayList<AlertDefine>()));

        mockMvc.perform(MockMvcRequestBuilders.get(
                "/api/alert/defines")
                .param("ids", ids.toString().substring(1, ids.toString().length() - 1))
                .param("priority", priority.toString())
                .param("sort", sort)
                .param("order", order)
                .param("pageIndex", pageIndex.toString())
                .param("pageSize", pageSize.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.content").value(new ArrayList<>()))
                .andExpect(jsonPath("$.data.pageable").value("INSTANCE"))
                .andExpect(jsonPath("$.data.totalPages").value(1))
                .andExpect(jsonPath("$.data.totalElements").value(0))
                .andExpect(jsonPath("$.data.last").value(true))
                .andExpect(jsonPath("$.data.number").value(0))
                .andExpect(jsonPath("$.data.size").value(0))
                .andExpect(jsonPath("$.data.first").value(true))
                .andExpect(jsonPath("$.data.numberOfElements").value(0))
                .andExpect(jsonPath("$.data.empty").value(true))
                .andExpect(jsonPath("$.data.sort.empty").value(true))
                .andExpect(jsonPath("$.data.sort.sorted").value(false))
                .andExpect(jsonPath("$.data.sort.unsorted").value(true))
                .andReturn();
    }

    @Test
    void deleteAlertDefines() throws Exception {
        this.mockMvc.perform(MockMvcRequestBuilders.delete("/api/alert/defines")
                .contentType(MediaType.APPLICATION_JSON)
                .content(GsonUtil.toJson(ids)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }
}