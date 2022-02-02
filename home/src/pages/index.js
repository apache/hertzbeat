import React from 'react'
import clsx from 'clsx'
import Layout from '@theme/Layout'
import CodeBlock from '@theme/CodeBlock'
import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import useBaseUrl from '@docusaurus/useBaseUrl'
import Translate, {translate} from '@docusaurus/Translate';

import Feature from './components/Feature'
import Section from './components/Section'
import Highlight from './components/Highlight'
import LogoCarousel from './components/LogoCarousel'
import cdnTransfer from '../CdnTransfer'

import styles from './styles.module.css'
import { features, SetupExample, SurenessIntegration, friendLinks, mediaPartners } from '../constants'

function Home() {
    const context = useDocusaurusContext()
    const {siteConfig = {}} = context
    return (
        <Layout
            title={`${siteConfig.title} · ${siteConfig.tagline}`}
            description={`${siteConfig.tagline}`}>
            <header className={clsx('hero hero--primary', styles.heroBanner)}>
                <div className="container">
                    <h1 className="hero__title">
                        <img style={{width: '500px', marginTop: '100px'}} src={cdnTransfer('img/tancloud-brand.svg')} alt={'#'}/>
                    </h1>
                    <p className="hero__subtitle"><Translate>易用友好的高性能监控云</Translate></p>
                    <div className={styles.social}>
                        <a href="https://console.tancloud.cn"><img src="https://img.shields.io/badge/网站监控-4EB1BA.svg" alt={''}/></a>
                        <a href="https://console.tancloud.cn"><img src="https://img.shields.io/badge/PING连通性监控-blue.svg" alt={''}/></a>
                        <a href="https://console.tancloud.cn"><img src="https://img.shields.io/badge/端口可用性监控-green.svg" alt={''}/></a>
                        <a href="https://console.tancloud.cn"><img src="https://img.shields.io/badge/数据库监控-yellow.svg" alt={''}/></a>
                        <a href="https://console.tancloud.cn"><img src="https://img.shields.io/badge/自定义监控-orange.svg" alt={''}/></a>
                        <a href="https://console.tancloud.cn"><img src="https://img.shields.io/badge/阈值告警-red.svg" alt={''}/></a>
                        <a href="https://console.tancloud.cn"><img src="https://img.shields.io/badge/告警转发通知-blueviolet.svg" alt={''}/></a>
                    </div>
                    <div className={styles.buttons}>
                        <Link
                            to="https://console.tancloud.cn"
                            className={clsx(
                                'button button--outline button--secondary button--lg',
                                styles.getStarted,
                            )}>
                            <Translate>即刻登陆免费使用</Translate>
                        </Link>
                    </div>
                </div>
            </header>
            <main>
                {features && features.length > 0 && (
                    <Section isDark>
                        {features.map((props, idx) => (
                            <Feature key={idx} {...props} />
                        ))}
                    </Section>
                )}
                {/*who is using*/}
                {/*<Section>*/}
                {/*    <LogoCarousel logos={logos}></LogoCarousel>*/}
                {/*</Section>*/}

                {/*Friend Links*/}
                {/*<Section>*/}
                {/*    <LogoCarousel logos={friendLinks} headerTitle={translate({message: 'Friend Links'})}></LogoCarousel>*/}
                {/*</Section>*/}
                {/*/!*Media Partners*!/*/}
                {/*<Section>*/}
                {/*    <LogoCarousel logos={mediaPartners} headerTitle={translate({message: 'Media Partners'})}></LogoCarousel>*/}
                {/*</Section>*/}
            </main>
        </Layout>
    )
}

export default Home
