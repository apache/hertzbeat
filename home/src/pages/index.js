// _____________________________________________________________________
// Serafin O. Gargantiel III - Contribution
// Refactored UI Design
// _____________________________________________________________________

// Imports for React and Docusaurus Resources
import React, { useEffect } from 'react'
import clsx from 'clsx'
import Layout from '@theme/Layout'
import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import useBaseUrl from '@docusaurus/useBaseUrl'
import Translate from '@docusaurus/Translate'

// Import of swiper, the carousel/slider library
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay } from 'swiper'
import 'swiper/css'
import 'swiper/css/pagination'

// Custom components and data
import Feature from './components/Feature'
import StructuredData from '../components/StructuredData'
import styles from './styles.module.css'
import { features } from '../constants'

// _____________________________________________________________________


// 
function Home() {

  const context = useDocusaurusContext() //Access site's global configuration (docusarus.config.js)
  useEffect(() => autoRedirect(), [])    //Calls autoRedirect function when page loads
  const { siteConfig = {} } = context   //Pulls the site's configuration from the context

  // Return UI/UX Design
  // ________________________________________________________________________________________________
  return (
      <>
        {/* Injects SEO metadata into the page head */}
        {/* Search Engine Optization */}
        <StructuredData />
        <Layout
            title={`${siteConfig.title} · ${siteConfig.tagline}`}
            description={`${siteConfig.tagline}`}
        >

          {/* Hero Section */}
          {/* --------------------------------------------------------- */}

          {/* Banners with Site Title */}
          <header className={clsx('hero--primary', styles.heroBanner)}>
            <div className="container">
              <h1 className="hero__title">

                {/* Image Logo */}
                <img
                    src={'/img/hertzbeat-brand.svg'}
                    alt={'HertzBeat Logo'}
                />
              </h1>

              {/* Slogan Sub-Title */}
              <p className="hero__subtitle">
                <Translate>slogan</Translate>
              </p>

              {/* QuickStart Button */}
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
          {/* --------------------------------------------------------- */}

          <main>
            {/* Features Section */}
            {features && features.length > 0 && (
                <section className={styles.featuresSection}>

                  {/* Feature Cards */}
                  <div className="container">
                    <div className={styles.featuresRow}>
                      {features.map((props, idx) => (
                          <Feature key={idx} {...props} index={idx} />
                      ))}
                    </div>
                  </div>

                </section>
            )}

            {/* Swiper Carousel Section - Helps Create Image Slideshows for HertzBeat*/}
            <div className={styles.swiperContainer}>
              <div className={styles.swiperInner}>

                {/* Swiper - Autoplays Image Slideshow */}
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

                  {/* Each Image Presented in the Swiper */}
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
  // ________________________________________________________________________________________________
}

export default Home

// AutoRedirect() - Detects the user's browser language on page load
function autoRedirect() {
  
  // User Language
  let lang = global.navigator?.language || navigator?.userLanguage

  // If language is chinese, redirect to "/zh-cn" version of the site
  if (lang != null && (lang.toLowerCase() === 'zh-cn' || lang.toLowerCase().indexOf('zh') > 0)) {
    console.log(window.location.pathname);
    if (sessionStorage.getItem('auto_detect_redirect') !== 'true' && !window.location.pathname.startsWith('/zh-cn', false)) {
      sessionStorage.setItem('auto_detect_redirect', 'true')
      window.location.href = '/zh-cn'
    }
  }
  
}
