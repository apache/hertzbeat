import React, { useEffect } from "react";
import clsx from "clsx";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Translate, { translate } from "@docusaurus/Translate";

import { Swiper, SwiperSlide } from "swiper/react";
import { EffectFade, Navigation, Autoplay } from "swiper";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

import Feature from "./components/Feature";
import Section from "./components/Section";
import LogoCarousel from "./components/LogoCarousel";
import cdnTransfer from "../CdnTransfer";

import styles from "./styles.module.css";
import { features, usersLink } from "../constants";
import DiaLog from "./components/DiaLog";

function Home() {
  const context = useDocusaurusContext();
  useEffect(() => autoRedirect(), []);
  const { siteConfig = {} } = context;
  return (
    <>
      <Layout
        title={`${siteConfig.title} · ${siteConfig.tagline}`}
        description={`${siteConfig.tagline}`}
      >
        <header className={clsx("hero hero--primary", styles.heroBanner)}>
          <div className="container">
            <h1 className="hero__title">
              <img
                style={{ width: "500px", marginTop: "100px" }}
                src={cdnTransfer("/img/hertzbeat-brand.svg")}
                alt={"#"}
              />
            </h1>
            <p className="hero__subtitle">
              <Translate>slogan</Translate>
            </p>
            <div className={styles.buttons}>
              <Link
                to="/docs/"
                className={clsx(
                  "button button--primary button--lg",
                  styles.getStarted
                )}
              >
                <Translate>quickstart</Translate>
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
                nextEl: ".user-swiper-button-next",
                prevEl: ".user-swiper-button-prev",
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
                  style={{
                    width: "1400px",
                    display: "block",
                    margin: "0 auto",
                  }}
                  src={useBaseUrl("/img/docs/hertzbeat-arch.png")}
                />
              </SwiperSlide>
              <SwiperSlide>
                <img
                  style={{
                    width: "1400px",
                    display: "block",
                    margin: "0 auto",
                  }}
                  src={useBaseUrl("/img/home/status.png")}
                />
              </SwiperSlide>
              <SwiperSlide>
                <img
                  style={{
                    width: "1400px",
                    display: "block",
                    margin: "0 auto",
                  }}
                  src={useBaseUrl("/img/home/0.png")}
                />
              </SwiperSlide>
              <SwiperSlide>
                <img
                  style={{
                    width: "1400px",
                    display: "block",
                    margin: "0 auto",
                  }}
                  src={useBaseUrl("/img/home/1.png")}
                />
              </SwiperSlide>
              <SwiperSlide>
                <img
                  style={{
                    width: "1400px",
                    display: "block",
                    margin: "0 auto",
                  }}
                  src={useBaseUrl("/img/home/9.png")}
                />
              </SwiperSlide>
            </Swiper>
          </div>

          <div
            className="swiper-button-prev user-swiper-button-prev"
            style={{ top: "880px", left: "50px", color: "#000033" }}
          />
          <div
            className="swiper-button-next user-swiper-button-next"
            style={{ top: "880px", right: "50px", color: "#000033" }}
          />
          {/*who is using*/}
          <Section isDark>
            <LogoCarousel
              logos={usersLink}
              headerTitle={translate({ message: "Who uses HertzBeat?" })}
            ></LogoCarousel>
          </Section>
          {features && features.length > 0 && (
            <Section>
              {features.map((props, idx) => (
                <Feature key={idx} {...props} />
              ))}
            </Section>
          )}
        </main>
      </Layout>
      <DiaLog />
      <footer className="footer footer--dark">
        <div className="container container-fluid">
          <div className="row footer__links">
            <div className="col footer__col">
              <div className="footer__title"></div>
              <ul className="footer__items clean-list">
                <li className="footer__item">
                  <div className="footer-left-box">
                    <div className="flex align-center footer-system">
                      <span className="system-title">About Hertzbeat</span>
                    </div>
                    <p>
                      Make stream processing easier! Easy-to-use streaming
                      application development framework and operation platform,
                      with Apache Flink and Apache Spark supported.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="col footer__col">
              <div className="footer__title">Resource</div>
              <ul className="footer__items clean-list">
                <li className="footer__item">
                  <a className="footer__link-item" href="/docs/intro">
                    Documentation
                  </a>
                </li>
                <li className="footer__item">
                  <a
                    href="https://github.com/apache/incubator-Hertzbeat/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer__link-item"
                  >
                    Releases
                    <svg
                      width="13.5"
                      height="13.5"
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="iconExternalLink_nPIU"
                    >
                      <path
                        fill="currentColor"
                        d="M21 13v10h-21v-19h12v2h-10v15h17v-8h2zm3-12h-10.988l4.035 4-6.977 7.07 2.828 2.828 6.977-7.07 4.125 4.172v-11z"
                      ></path>
                    </svg>
                  </a>
                </li>
                <li className="footer__item">
                  <a
                    href="https://github.com/apache/incubator-Hertzbeat/issues/507"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer__link-item"
                  >
                    FAQ
                    <svg
                      width="13.5"
                      height="13.5"
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="iconExternalLink_nPIU"
                    >
                      <path
                        fill="currentColor"
                        d="M21 13v10h-21v-19h12v2h-10v15h17v-8h2zm3-12h-10.988l4.035 4-6.977 7.07 2.828 2.828 6.977-7.07 4.125 4.172v-11z"
                      ></path>
                    </svg>
                  </a>
                </li>
              </ul>
            </div>
            <div className="col footer__col">
              <div className="footer__title">Community</div>
              <ul className="footer__items clean-list">
                <li className="footer__item">
                  <a
                    href="https://github.com/apache/incubator-Hertzbeat"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer__link-item"
                  >
                    GitHub
                    <svg
                      width="13.5"
                      height="13.5"
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="iconExternalLink_nPIU"
                    >
                      <path
                        fill="currentColor"
                        d="M21 13v10h-21v-19h12v2h-10v15h17v-8h2zm3-12h-10.988l4.035 4-6.977 7.07 2.828 2.828 6.977-7.07 4.125 4.172v-11z"
                      ></path>
                    </svg>
                  </a>
                </li>
                <li className="footer__item">
                  <a
                    href="https://github.com/apache/incubator-Hertzbeat/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer__link-item"
                  >
                    Issue Tracker
                    <svg
                      width="13.5"
                      height="13.5"
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="iconExternalLink_nPIU"
                    >
                      <path
                        fill="currentColor"
                        d="M21 13v10h-21v-19h12v2h-10v15h17v-8h2zm3-12h-10.988l4.035 4-6.977 7.07 2.828 2.828 6.977-7.07 4.125 4.172v-11z"
                      ></path>
                    </svg>
                  </a>
                </li>
                <li className="footer__item">
                  <a
                    href="https://github.com/apache/incubator-Hertzbeat/pulls"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer__link-item"
                  >
                    Pull Requests
                    <svg
                      width="13.5"
                      height="13.5"
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="iconExternalLink_nPIU"
                    >
                      <path
                        fill="currentColor"
                        d="M21 13v10h-21v-19h12v2h-10v15h17v-8h2zm3-12h-10.988l4.035 4-6.977 7.07 2.828 2.828 6.977-7.07 4.125 4.172v-11z"
                      ></path>
                    </svg>
                  </a>
                </li>
              </ul>
            </div>
            <div className="col footer__col">
              <div className="footer__title">Follow</div>
              <ul className="footer__items clean-list">
                <li className="footer__item">
                  <div className="subscribe-box">
                    <div
                      className="d-flex align-items-center"
                      style="margin-bottom: 30px;padding-top: 11px"
                    >
                      <div className="subscribe-input flex-fill">
                        <input
                          className="form-control"
                          id="email_address"
                          maxlength="60"
                          name="email_address"
                          placeholder="Subscribe with us"
                        />
                      </div>
                      <div className="subscribe-submit-inner">
                        <a
                          className="btn btn-white m-0"
                          type="submit"
                          href="mailto:dev-subscribe@Hertzbeat.apache.org"
                        >
                          <span>
                            <i className="fa fa-paper-plane text-white"></i>
                          </span>
                        </a>
                      </div>
                    </div>
                    <ul className="icon-bottom">
                      <li>
                        <a href="javascript:void(0)">
                          <i className="fa fa-wechat"></i>
                          <div className="wechat-dropdown">
                            <img src="/image/join_wechat.png" alt="weChat" />
                          </div>
                        </a>
                      </li>
                      <li>
                        <a href="javascript:void(0)">
                          <i className="fa fa-twitter"></i>
                        </a>
                      </li>
                      <li>
                        <a href="javascript:void(0)">
                          <i className="fa fa-slack"></i>
                        </a>
                      </li>
                      <li>
                        <a href="javascript:void(0)">
                          <i className="fa fa-facebook"></i>
                        </a>
                      </li>
                    </ul>
                  </div>
                </li>
              </ul>
            </div>
          </div>
          <div className="footer__bottom text--center">
            <div className="footer__copyright">
              <div style="text-align: left;margin-top:30px">
                <div className="d-flex align-items-center">
                  <div>
                    <a
                      href="https://incubator.apache.org/"
                      className="footerLogoLink"
                      one-link-mark="yes"
                    >
                      <img
                        src="/image/apache-incubator.svg"
                        alt="Apache Incubator logo"
                        className="footer__logo"
                      />
                    </a>
                  </div>
                  <div>
                    <p style="font-family: Avenir-Medium;font-size: 14px;color: #999;line-height: 25px;">
                      Apache Hertzbeat is an effort undergoing incubation at
                      The Apache Software Foundation (ASF), sponsored by the
                      Apache Incubator. Incubation is required of all newly
                      accepted projects until a further review indicates that
                      the infrastructure, communications, and decision making
                      process have stabilized in a manner consistent with other
                      successful ASF projects. While incubation status is not
                      necessarily a reflection of the completeness or stability
                      of the code, it does indicate that the project has yet to
                      be fully endorsed by the ASF.
                    </p>
                  </div>
                </div>

                <div style="border-top: 1px solid #525252;min-height: 60px;line-height: 25px;text-align: left;font-family: Avenir-Medium;font-size: 14px;color: #999;display: flex;align-items: center;">
                  <span>
                    Copyright © 2022-2024 The Apache Software Foundation. Apache
                    Hertzbeat, Hertzbeat, and its feather logo are trademarks
                    of The Apache Software Foundation.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

export default Home;

function loadGitter() {
  return new Promise(function (resolve, reject) {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = "https://sidecar.gitter.im/dist/sidecar.v1.js";
    ((window.gitter = {}).chat = {}).options = {
      room: "hertzbeat/community",
    };
    script.onload = function () {
      ((window.gitter = {}).chat = {}).options = {
        room: "hertzbeat/community",
      };
    };
    document.body.appendChild(script);
  });
}

function autoRedirect() {
  let lang = global.navigator?.language || navigator?.userLanguage;
  console.log("Current lang is " + lang);
  if (
    lang != null &&
    (lang.toLowerCase() === "zh-cn" || lang.toLowerCase().indexOf("zh") > 0)
  ) {
    console.log(window.location.pathname);
    if (
      sessionStorage.getItem("auto_detect_redirect") !== "true" &&
      !window.location.pathname.startsWith("/zh-cn", false)
    ) {
      console.log("current lang is zh-cn, redirect to zh-cn");
      sessionStorage.setItem("auto_detect_redirect", "true");
      window.location.href = "/zh-cn";
    }
  }
}
