/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.startup;

import java.lang.annotation.ElementType;
import java.lang.annotation.Inherited;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.apache.hertzbeat.startup.runtime.TrustedSpringBootContextLoader;
import org.springframework.test.context.ContextConfiguration;

/** Runs a full-application test through the official trusted startup boundary. */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Inherited
@ContextConfiguration(loader = TrustedSpringBootContextLoader.class)
public @interface TrustedStartup {
}
