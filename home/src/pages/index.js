import React from 'react'
import clsx from 'clsx'
import Layout from '@theme/Layout'
import CodeBlock from '@theme/CodeBlock'
import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import useBaseUrl from '@docusaurus/useBaseUrl'
import Translate, { translate } from '@docusaurus/Translate'

import { Swiper, SwiperSlide } from 'swiper/react'
import SwiperCore, { EffectFade, Navigation, Autoplay } from 'swiper'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

import Feature from './components/Feature'
import Section from './components/Section'
import Highlight from './components/Highlight'
import LogoCarousel from './components/LogoCarousel'
import cdnTransfer from '../CdnTransfer'

import styles from './styles.module.css'
import {
  features,
  SetupExample,
  SurenessIntegration,
  dromaraFriends,
  friendsLink,
} from '../constants'
import LogoCarouselStatic from './components/LogoCarouselStatic'

function Home() {
  const context = useDocusaurusContext()
  const { siteConfig = {} } = context
  return (
    <Layout
      title={`${siteConfig.title} · ${siteConfig.tagline}`}
      description={`${siteConfig.tagline}`}
    >
      <header className={clsx('hero hero--primary', styles.heroBanner)}>
        <div className="container">
          <h1 className="hero__title">
            <img
              style={{ width: '500px', marginTop: '100px' }}
              src={cdnTransfer('img/hertzbeat-brand.svg')}
              alt={'#'}
            />
          </h1>
          <p className="hero__subtitle">
            <Translate>易用友好的实时监控系统</Translate>
          </p>
          <div className={styles.social}>
            <a href="https://gitter.im/hertzbeat/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge">
              <img
                src={'https://badges.gitter.im/hertzbeat/community.svg'}
                alt={''}
              />
            </a>
            <a href="https://console.tancloud.cn">
              <img src={cdnTransfer('img/badge/web-monitor.svg')} alt={''} />
            </a>
            <a href="https://console.tancloud.cn">
              <img src={cdnTransfer('img/badge/ping-connect.svg')} alt={''} />
            </a>
            <a href="https://console.tancloud.cn">
              <img src={cdnTransfer('img/badge/port-available.svg')} alt={''} />
            </a>
            <a href="https://console.tancloud.cn">
              <img
                src={cdnTransfer('img/badge/database-monitor.svg')}
                alt={''}
              />
            </a>
            <a href="https://console.tancloud.cn">
              <img src={cdnTransfer('img/badge/os-monitor.svg')} alt={''} />
            </a>
            <a href="https://console.tancloud.cn">
              <img src={cdnTransfer('img/badge/custom-monitor.svg')} alt={''} />
            </a>
            <a href="https://console.tancloud.cn">
              <img src={cdnTransfer('img/badge/threshold.svg')} alt={''} />
            </a>
            <a href="https://console.tancloud.cn">
              <img src={cdnTransfer('img/badge/alert.svg')} alt={''} />
            </a>
          </div>
          <div className={styles.buttons}>
            <Link
              to="https://console.tancloud.cn"
              className={clsx(
                'button button--outline button--secondary button--lg',
                styles.getStarted
              )}
            >
              <Translate>即刻登录免费使用</Translate>
            </Link>
          </div>
        </div>
      </header>
      <main>
        <div className={styles.sectionDashboard}>
          <Swiper
            modules={[Autoplay, EffectFade, Navigation]}
            watchSlidesProgress={true}
            navigation={{
              nextEl: '.user-swiper-button-next',
              prevEl: '.user-swiper-button-prev',
            }}
            grabCursor
            // 轮播下用这个效果会失效
            // effect={'fade'}
            // fadeEffect={{
            //   crossFade: true
            // }}
            // slidesPerView={1}
            // 自动轮播
            loop={true}
            speed={0}
            autoplay={{
              delay: 3000,
              disableOnInteraction: false,
              waitForTransition: false,
            }}
          >
            <SwiperSlide>
              <img
                style={{ width: '1000px', display: 'block', margin: '0 auto' }}
                src={useBaseUrl('/img/home/1.png')}
              />
            </SwiperSlide>
            <SwiperSlide>
              <img
                style={{ width: '1000px', display: 'block', margin: '0 auto' }}
                src={useBaseUrl('/img/home/2.png')}
              />
            </SwiperSlide>
            <SwiperSlide>
              <img
                style={{ width: '1000px', display: 'block', margin: '0 auto' }}
                src={useBaseUrl('/img/home/3.png')}
              />
            </SwiperSlide>
            <SwiperSlide>
              <img
                style={{ width: '1000px', display: 'block', margin: '0 auto' }}
                src={useBaseUrl('/img/home/4.png')}
              />
            </SwiperSlide>
            <SwiperSlide>
              <img
                style={{ width: '1000px', display: 'block', margin: '0 auto' }}
                src={useBaseUrl('/img/home/5.png')}
              />
            </SwiperSlide>
            <SwiperSlide>
              <img
                style={{ width: '1000px', display: 'block', margin: '0 auto' }}
                src={useBaseUrl('/img/home/6.png')}
              />
            </SwiperSlide>
            <SwiperSlide>
              <img
                style={{ width: '1000px', display: 'block', margin: '0 auto' }}
                src={useBaseUrl('/img/home/7.png')}
              />
            </SwiperSlide>
            <SwiperSlide>
              <img
                style={{ width: '1000px', display: 'block', margin: '0 auto' }}
                src={useBaseUrl('/img/home/8.png')}
              />
            </SwiperSlide>
          </Swiper>
        </div>
        <div
          className="swiper-button-prev user-swiper-button-prev"
          style={{ top: '880px', left: '50px', color: '#000033' }}
        ></div>
        <div
          className="swiper-button-next user-swiper-button-next"
          style={{ top: '880px', right: '50px', color: '#000033' }}
        ></div>
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
        <Section>
          <LogoCarousel
            logos={dromaraFriends}
            headerTitle={translate({ message: 'Dromara Friends' })}
          />
        </Section>
        {/*/!*Friend Links*!/*/}
        <Section>
          <LogoCarouselStatic
            logos={friendsLink}
            headerTitle={translate({ message: 'Friends Link' })}
          />
        </Section>
      </main>
    </Layout>
  )
}

export default Home

function loadGitter() {
  return new Promise(function (resolve, reject) {
    var script = document.createElement('script')
    script.type = 'text/javascript'
    script.async = true
    script.src = 'https://sidecar.gitter.im/dist/sidecar.v1.js'
    ;((window.gitter = {}).chat = {}).options = {
      room: 'hertzbeat/community',
    }
    script.onload = function () {
      ;((window.gitter = {}).chat = {}).options = {
        room: 'hertzbeat/community',
      }
    }
    document.body.appendChild(script)
  })
}
