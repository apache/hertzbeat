package org.apache.hertzbeat.manager.config;

import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLClassLoader;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.jar.JarFile;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.jetbrains.annotations.NotNull;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.BeanDefinitionBuilder;
import org.springframework.beans.factory.support.BeanDefinitionRegistry;
import org.springframework.beans.factory.support.BeanNameGenerator;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.ImportBeanDefinitionRegistrar;
import org.springframework.core.type.AnnotationMetadata;
import org.springframework.stereotype.Component;


/**
 * Plugin configuration
 */
@Slf4j
@Component
public class PluginConfig implements ImportBeanDefinitionRegistrar, ApplicationContextAware {
    @Autowired
    private ApplicationContext applicationContext;
    @Autowired
    private DefaultListableBeanFactory defaultListableBeanFactory;

    private static final String CLASS_SUFFIX = ".class";

    private static final String BASE_PLUGIN_PATH = "org/apache/hertzbeat/plugin/Plugin";

    private static final String BASE_PATH = System.getProperty("user.dir") + File.separator + "ext-lib";

    private static final String PACKAGE = "org/hertzbeat/plugin";

    private URLClassLoader getClassLoader() {
        List<String> jars = getAllJars();
        if (jars == null) {
            return null;
        }
        List<URL> urlList = new ArrayList<>();
        for (String jar : jars) {
            try {
                URL url = new File(jar).toURI().toURL();
                urlList.add(url);
            } catch (MalformedURLException e) {
                log.error("Error converting jar to URL: {}", jar, e);
            }
        }
        if (urlList.isEmpty()) {
            return null;
        }
        URL[] urls = urlList.toArray(new URL[0]);
        ClassLoader contextClassLoader = Thread.currentThread().getContextClassLoader();
        return new URLClassLoader(urls, contextClassLoader);
    }


    private List<String> getAllJars() {
        log.info("BASE_PATH:{}", PluginConfig.BASE_PATH);
        File file = new File(PluginConfig.BASE_PATH);
        File[] files = file.listFiles();
        if (files == null) {
            return null;
        }
        return Arrays.stream(files)
                .filter(f -> f.getName().endsWith(".jar"))
                .map(File::getAbsolutePath)
                .collect(Collectors.toList());
    }

    private List<String> getAllClassNamesFromJar() throws IOException {
        List<String> jars = getAllJars();
        if (jars == null || jars.isEmpty()) {
            return null;
        }
        List<String> classNames = new ArrayList<>();
        for (String jar : jars) {
            List<String> collect;
            try (JarFile file = new JarFile(jar)) {
                collect = file.stream()
                        .filter(jarEntry -> jarEntry.getName().endsWith(CLASS_SUFFIX))
                        .filter(jarEntry -> jarEntry.getName().startsWith(PACKAGE))
                        .filter(jarEntry -> !jarEntry.getName().contains(BASE_PLUGIN_PATH))
                        .map(jarEntry -> jarEntry.getName().replace("/", ".").replace(".class", ""))
                        .toList();
            }
            classNames.addAll(collect);
        }
        return classNames;
    }

    private void registerBean(Class<?> c, BeanDefinitionRegistry registry) {
        String className = c.getName();
        BeanDefinitionBuilder builder = BeanDefinitionBuilder.genericBeanDefinition(c);
        BeanDefinition beanDefinition = builder.getBeanDefinition();
        registry.registerBeanDefinition(className, beanDefinition);
    }

    @Override
    public void registerBeanDefinitions(@NotNull AnnotationMetadata importingClassMetadata, @NotNull BeanDefinitionRegistry registry, @NotNull BeanNameGenerator importBeanNameGenerator) {
        URLClassLoader classLoader = getClassLoader();
        List<String> allClassNamesFromJar;
        try {
            allClassNamesFromJar = getAllClassNamesFromJar();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        if (allClassNamesFromJar != null) {
            for (String name : allClassNamesFromJar) {
                if (name == null || name.trim().isEmpty()) {
                    log.error("class name is null or empty");
                    continue;
                }
                if (classLoader != null) {
                    Class<?> clazz = null;
                    try {
                        clazz = classLoader.loadClass(name);
                    } catch (ClassNotFoundException e) {
                        log.error("load class error:{}", e.getLocalizedMessage());
                    }
                    if (clazz != null) {
                        registerBean(clazz, registry);
                    }
                }
            }
        }    }

    public List<Object> getBean() throws IOException {
        List<String> names = getAllClassNamesFromJar();
        List<Object> beans = new ArrayList<>();
        if (names != null) {
            for (String name : names) {
                Object bean = applicationContext.getBean(name);
                beans.add(bean);
            }
        }
        return beans;
    }

    @Override
    public void setApplicationContext(@NotNull ApplicationContext applicationContext) throws BeansException {
        this.applicationContext = applicationContext;
        ConfigurableApplicationContext configurableApplicationContext = (ConfigurableApplicationContext) applicationContext;
        this.defaultListableBeanFactory = (DefaultListableBeanFactory) configurableApplicationContext.getBeanFactory();
    }
}
