import React, { useEffect } from 'react'
import clsx from 'clsx'
import Layout from '@theme/Layout'
import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import useBaseUrl from '@docusaurus/useBaseUrl'
import Translate from '@docusaurus/Translate'

import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay } from 'swiper'
import 'swiper/css'
import 'swiper/css/pagination'

import Feature from './components/Feature'

import styles from './styles.module.css'
import { features } from '../constants'

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
          {/* Hero Section */}
          <header className={clsx('hero--primary', styles.heroBanner)}>
            <div className="container">
              <h1 className="hero__title">
                <img
                    src={'/img/hertzbeat-brand.svg'}
                    alt={'HertzBeat Logo'}
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
            {/* Features Section */}
            {features && features.length > 0 && (
                <section className={styles.featuresSection}>
                  <div className="container">
                    <div className={styles.featuresRow}>
                      {features.map((props, idx) => (
                          <Feature key={idx} {...props} index={idx} />
                      ))}
                    </div>
                  </div>
                </section>
            )}

            {/* Swiper Carousel Section */}
            <div className={styles.swiperContainer}>
              <div className="container">
                <Swiper
                    modules={[Autoplay]}
                    grabCursor
                    loop={true}
                    speed={600}
                    autoplay={{
                      delay: 6000,
                      disableOnInteraction: false,
                    }}
                >
                  <SwiperSlide>
                    <img
                        src={useBaseUrl('/img/docs/hertzbeat-arch.png')}
                        alt="HertzBeat Architecture"
                    />
                  </SwiperSlide>
                  <SwiperSlide>
                    <img
                        src={useBaseUrl('/img/home/status.png')}
                        alt="Monitoring Status"
                    />
                  </SwiperSlide>
                  <SwiperSlide>
                    <img
                        src={useBaseUrl('/img/home/0.png')}
                        alt="Dashboard Overview"
                    />
                  </SwiperSlide>
                  <SwiperSlide>
                    <img
                        src={useBaseUrl('/img/home/1.png')}
                        alt="Feature Demo"
                    />
                  </SwiperSlide>
                  <SwiperSlide>
                    <img
                        src={useBaseUrl('/img/home/9.png')}
                        alt="Advanced Features"
                    />
                  </SwiperSlide>
                </Swiper>
              </div>
            </div>
          </main>
        </Layout>
      </>
  )
}

export default Home

function autoRedirect() {
  let lang = global.navigator?.language || navigator?.userLanguage
  if (lang != null && (lang.toLowerCase() === 'zh-cn' || lang.toLowerCase().indexOf('zh') > 0)) {
    console.log(window.location.pathname);
    if (sessionStorage.getItem('auto_detect_redirect') !== 'true' && !window.location.pathname.startsWith('/zh-cn', false)) {
      sessionStorage.setItem('auto_detect_redirect', 'true')
      window.location.href = '/zh-cn'
    }
  }
}
