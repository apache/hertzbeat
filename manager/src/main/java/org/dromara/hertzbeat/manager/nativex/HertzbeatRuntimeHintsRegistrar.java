package org.dromara.hertzbeat.manager.nativex;

import org.apache.sshd.common.channel.ChannelListener;
import org.apache.sshd.common.forward.PortForwardingEventListener;
import org.apache.sshd.common.io.nio2.Nio2ServiceFactory;
import org.apache.sshd.common.io.nio2.Nio2ServiceFactoryFactory;
import org.apache.sshd.common.session.SessionListener;
import org.apache.sshd.common.util.security.bouncycastle.BouncyCastleSecurityProviderRegistrar;
import org.apache.sshd.common.util.security.eddsa.EdDSASecurityProviderRegistrar;
import org.springframework.aot.hint.ExecutableMode;
import org.springframework.aot.hint.MemberCategory;
import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;
import org.springframework.aot.hint.TypeReference;
import org.springframework.util.ClassUtils;

import java.lang.reflect.Constructor;
import java.util.Set;

/**
 * @author songyinyin
 * @since 2023/11/3 15:23
 */
public class HertzbeatRuntimeHintsRegistrar implements RuntimeHintsRegistrar {

    private static final String SshConstantsClassName = "org.apache.sshd.common.SshConstants";

    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
        // see: https://github.com/spring-cloud/spring-cloud-config/blob/main/spring-cloud-config-server/src/main/java/org/springframework/cloud/config/server/config/ConfigServerRuntimeHints.java
        // TODO: move over to GraalVM reachability metadata
        if (ClassUtils.isPresent(SshConstantsClassName, classLoader)) {
            hints.reflection().registerTypes(Set.of(TypeReference.of(BouncyCastleSecurityProviderRegistrar.class),
                            TypeReference.of(EdDSASecurityProviderRegistrar.class), TypeReference.of(Nio2ServiceFactory.class),
                            TypeReference.of(Nio2ServiceFactoryFactory.class)),
                    hint -> hint.withMembers(MemberCategory.INVOKE_DECLARED_CONSTRUCTORS));
            hints.reflection().registerTypes(Set.of(TypeReference.of(PortForwardingEventListener.class)),
                    hint -> hint.withMembers(MemberCategory.INVOKE_DECLARED_CONSTRUCTORS,
                            MemberCategory.INVOKE_DECLARED_METHODS, MemberCategory.DECLARED_FIELDS));
            hints.proxies().registerJdkProxy(TypeReference.of(ChannelListener.class),
                    TypeReference.of(PortForwardingEventListener.class), TypeReference.of(SessionListener.class));
        }
    }

    private void registerConstructor(RuntimeHints hints, Class<?> clazz) {
        Constructor<?>[] declaredConstructors = clazz.getDeclaredConstructors();
        for (Constructor<?> declaredConstructor : declaredConstructors) {
            hints.reflection().registerConstructor(declaredConstructor, ExecutableMode.INVOKE);
        }
    }
}
