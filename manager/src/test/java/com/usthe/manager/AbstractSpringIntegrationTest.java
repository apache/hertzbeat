package com.usthe.manager;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Abstract Integration Test for Spring.
 */
@ActiveProfiles("test")
@SpringBootTest(classes = Manager.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class AbstractSpringIntegrationTest {

}
