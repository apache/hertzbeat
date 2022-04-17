import React from 'react'

import Translate, {translate} from '@docusaurus/Translate'


export const features = [{
    title: translate({
        message: '开箱即用'
    }),
    description: (
        <>
            <Translate values={{
                TANCLOUD: <strong>TANCLOUD</strong>,
                SAAS: <strong>SAAS</strong>,
                console: <a href={'https://www.console.tancloud.cn'}><strong>Login Now</strong></a>,
                br: <br/>
            }}>
                {'中小团队和个人无需再为了监控自己的网站资源，而去部署一套繁琐的监控系统。往往有时候，那套监控系统比自身网站消耗的资源还大。' +
                '{TANCLOUD} 提供{SAAS}云版本，{console}即可开始您的服务监控。{br}' +
                '安全是最重要的，我们对账户密钥和监控密钥全链路加密。'
                }
            </Translate>
        </>
    ),
}, {
    title: translate({
        message: '多支持与自定义'
    }),
    description: (
        <>
            <Translate values={{
                custom: <a href={'/docs/advanced/extend-point'}><strong>Custom-Monitoring 自定义监控</strong></a>,
                br: <br/>
            }}>
                {'HertzBeat目前支持对网站，API，PING连通性，端口可用性，SiteMap全站，数据库，操作系统等的监控，快速迭代提供更多的监控类型和性能指标。{br}' +
                '我们提供了更自由化的阈值告警配置，支持邮箱，短信，webhook，钉钉，企业微信，飞书机器人等告警通知。{br}' +
                '不同团队的监控需求千变万化，我们提供{custom}，仅需配置YML就能快速接入监控系统。'
                }
            </Translate>
        </>
    ),
},
    {
        title: translate({
            message: '拥抱开源'
        }),
        description: (
            <>
                <Translate values={{
                    github: <a href={'https://github.com/dromara/hertzbeat'}><strong>HertzBeat Code Github</strong></a>,
                    gitee: <a href={'https://gitee.com/dromara/hertzbeat'}><strong>HertzBeat Code Gitee</strong></a>,
                    br: <br/>
                }}>
                    {'HertzBeat监控系统代码开源，非常欢迎任何对此有兴趣的同学参与中来，我们一起进步，丰富的资源文档正在完善中。{br}' +
                    '中二的我们相信开源改变世界！{br}' +
                    '{github} {br}' +
                    '{gitee}'
                    }
                </Translate>
            </>
        ),
    }]

export const friendLinks = [
    {
        img: 'ShenYu_logo.png',
        alt: 'ShenYu',
        url: 'https://dromara.org/projects/soul/overview/'
    }, {
        img: 'maxkey_logo.png',
        alt: 'MaxKey',
        url: 'https://maxkey.top/'
    }, {
        img: 'tlog_logo.png',
        alt: 'TLog',
        url: 'https://yomahub.com/tlog/'
    }, {
        img: 'hutool_logo.jpg',
        alt: 'Hutool',
        url: 'https://hutool.cn/'
    }, {
        img: 'satoken_logo.png',
        alt: 'Sa-Token',
        url: 'http://sa-token.dev33.cn/'
    }, {
        img: 'justauth_logo.png',
        alt: 'Justauth',
        url: 'https://justauth.wiki/'
    }, {
        img: 'pha_logo.jfif',
        alt: 'pha_api',
        url: 'https://www.phalapi.net/'
    }, {
        img: 'liteflow_logo.png',
        alt: 'LiteFlow',
        url: 'https://yomahub.com/liteflow/'
    }
]

export const mediaPartners = [
    {
        img: 'dromara_qr.png',
        alt: 'Dromara',
        url: 'https://mp.weixin.qq.com/s/Q3b7ZE802IMF6MwIPJIGQA'
    },
    {
        img: 'JavaHouDuan_logo.png',
        alt: 'JavaHouDuan',
        url: 'https://mp.weixin.qq.com/s/Ylq51a7Av8ZRuH811xZnDA'
    }
]


export const SetupExample = `
<dependency>
    <groupId>com.usthe.sureness</groupId>
    <artifactId>sureness-core</artifactId>
    <version>1.0.6</version>
</dependency>

compile group: 'com.usthe.sureness', name: 'sureness-core', version: '1.0.6'
`

export const SurenessIntegration = `
    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain)
            throws IOException, ServletException {
        try {
            SubjectSum subject = SurenessSecurityManager.getInstance().checkIn(servletRequest);
        } catch (IncorrectCredentialsException | UnknownAccountException | ExpiredCredentialsException e1) {
            logger.debug("this request account info is illegal");
            responseWrite(ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED).body(e1.getMessage()), servletResponse);
            return;
        } catch (UnauthorizedException e4) {
            logger.debug("this account can not access this resource");
            responseWrite(ResponseEntity
                    .status(HttpStatus.FORBIDDEN).body(e4.getMessage()), servletResponse);
            return;
        } catch (RuntimeException e) {
            logger.error("other exception happen: ", e);
            responseWrite(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build(),
                    servletResponse);
            return;
        }
        filterChain.doFilter(servletRequest, servletResponse);
    }
`
