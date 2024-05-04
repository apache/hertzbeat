import React, { useEffect } from 'react'
import clsx from 'clsx'
import Layout from '@theme/Layout'
import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import useBaseUrl from '@docusaurus/useBaseUrl'
import Translate from '@docusaurus/Translate'

import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectFade, Navigation, Autoplay } from 'swiper'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

import Feature from './components/Feature'
import Section from './components/Section'

import styles from './styles.module.css'
import {features} from '../constants'

function Home() {
  const context = useDocusaurusContext()
  useEffect(() => autoRedirect(), [])
  const { siteConfig = {} } = context
  return (
      <>
        <Layout
            title={`${siteConfig.title} · ${siteConfig.tagline}`}
            description={`${siteConfig.tagline}`}
        >
          <header className={clsx('hero--primary', styles.heroBanner)}>
            <div className="container">
              <h1 className="hero__title">
                <img
                    style={{ width: '500px', marginTop: '100px' }}
                    src={'/img/hertzbeat-brand.svg'}
                    alt={'#'}
                />
              </h1>
              <p className="hero__subtitle">
                <Translate>slogan</Translate>
              </p>
              <div className={styles.buttons}>
                <Link
                    to="/docs/"
                    className={clsx(
                        'button button--primary button--lg'
                    )}
                >
                  <Translate>quickstart</Translate>
                </Link>
              </div>
            </div>
          </header>
          <main>
            <div>
              <Swiper
                  modules={[Autoplay, EffectFade, Navigation]}
                  watchSlidesProgress={true}
                  navigation={{
                    nextEl: '.user-swiper-button-next',
                    prevEl: '.user-swiper-button-prev',
                  }}
                  grabCursor
                  // effect will disable when auto scroll
                  // effect={'fade'}
                  // fadeEffect={{
                  //   crossFade: true
                  // }}
                  // slidesPerView={1}
                  // auto scroll
                  loop={true}
                  speed={0}
                  autoplay={{
                    delay: 6000,
                    disableOnInteraction: false,
                    waitForTransition: false,
                  }}
              >
                <SwiperSlide>
                  <img
                      style={{ width: '1400px', display: 'block', margin: '0 auto' }}
                      src={useBaseUrl('/img/docs/hertzbeat-arch.png')}
                  />
                </SwiperSlide>
                <SwiperSlide>
                  <img
                      style={{ width: '1400px', display: 'block', margin: '0 auto' }}
                      src={useBaseUrl('/img/home/status.png')}
                  />
                </SwiperSlide>
                <SwiperSlide>
                  <img
                      style={{ width: '1400px', display: 'block', margin: '0 auto' }}
                      src={useBaseUrl('/img/home/0.png')}
                  />
                </SwiperSlide>
                <SwiperSlide>
                  <img
                      style={{ width: '1400px', display: 'block', margin: '0 auto' }}
                      src={useBaseUrl('/img/home/1.png')}
                  />
                </SwiperSlide>
                <SwiperSlide>
                  <img
                      style={{ width: '1400px', display: 'block', margin: '0 auto' }}
                      src={useBaseUrl('/img/home/9.png')}
                  />
                </SwiperSlide>
              </Swiper>
            </div>

            <div
                className="swiper-button-prev user-swiper-button-prev"
                style={{ top: '880px', left: '50px', color: '#000033' }}
            />
            <div
                className="swiper-button-next user-swiper-button-next"
                style={{ top: '880px', right: '50px', color: '#000033' }}
            />
            {features && features.length > 0 && (
                <Section>
                  {features.map((props, idx) => (
                      <Feature key={idx} {...props} />
                  ))}
                </Section>
            )}
          </main>
        </Layout>
      </>
  )
}

export default Home

function autoRedirect() {
  let lang = global.navigator?.language || navigator?.userLanguage
  console.log('Current lang is ' + lang)
  if (lang != null && (lang.toLowerCase() === 'zh-cn' || lang.toLowerCase().indexOf('zh') > 0)) {
    console.log(window.location.pathname);
    if (sessionStorage.getItem('auto_detect_redirect') !== 'true' && !window.location.pathname.startsWith('/zh-cn', false)) {
      console.log('current lang is zh-cn, redirect to zh-cn')
      sessionStorage.setItem('auto_detect_redirect', 'true')
      window.location.href = '/zh-cn'
    }
  }
}
