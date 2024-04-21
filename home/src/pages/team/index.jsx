import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import config from "./member.json";
import Layout from '@theme/Layout';
import './index.css';
import Github from "./github.svg"
import AOS from 'aos';
import 'aos/dist/aos.css';
import Translate from '@docusaurus/Translate'

export default function () {
  const dataSource = config;

  function getGitName(url) {
    return '@' + url.replace('https://github.com/', '');
  }

  function avatarUrl(id) {
    return 'https://avatars.githubusercontent.com/u/'+ id + '?v=4'
  }

  return (
    <BrowserOnly>
      {() => {
        // AOS JS
        AOS.init({
          offset: 100,
          duration: 700,
          easing: "ease-out-quad",
          once: !0
        });
        window.addEventListener('load', AOS.refresh);
        return <Layout>
          <div className="block team_page" style={{padding: "10px 0 30px"}}>
            <h3><Translate>team.name</Translate></h3>
            <hr style={{maxWidth: "10rem"}}></hr>
            <p className="team_desc team_indent"><Translate>team.desc</Translate></p>
            <h3 className="team_title">
              Mentor
              <span className="desc"><Translate>team.tip</Translate></span>
            </h3>
            <div className="team-row">
              {
                dataSource.mentor.map((item, i) => (
                  <div className='team-box' key={i} data-aos="fade-up" data-aos-delay={i * 100}>
                    <div style={{textAlign: "center"}}>
                      <div style={{overflow: "hidden", zIndex: 1}}>
                        <img className="team-user-img" src={avatarUrl(item.githubId)} title="" alt=""/>
                      </div>
                      <div className="bg-team">
                        <h6 className="team-name">{item.name}</h6>
                        <small>{getGitName(item.gitUrl)}</small>
                        <div>
                          <a className="team-link" href={item.gitUrl}>
                            <Github className="github-icon"/>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>

            <h3 className="team_title">
              PPMC
              <span className="desc"><Translate>team.tip</Translate></span>
            </h3>
            <div className="team-row">
              {
                dataSource.pmc.map((item, i) => (
                  <div className='team-box' key={i} data-aos="fade-up" data-aos-delay={i * 100}>
                    <div style={{textAlign: "center"}}>
                      <div style={{overflow: "hidden", zIndex: 1}}>
                        <img className="team-user-img" src={avatarUrl(item.githubId)} title="" alt=""/>
                      </div>
                      <div className="bg-team">
                        <h6 className="team-name">{item.name}</h6>
                        <small>{getGitName(item.gitUrl)}</small>
                        <div>
                          <a className="team-link" href={item.gitUrl}>
                            <Github className="github-icon"/>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>

            <h3 className="team_title">
              Committer
              <span className="desc"><Translate>team.tip</Translate></span>
            </h3>
            <div className="team-row">
              {
                dataSource.committer.map((item, i) => (
                  <div className='team-box' key={i} data-aos="fade-up" data-aos-delay={i * 100}>
                    <div style={{textAlign: "center"}}>
                      <div style={{overflow: "hidden", zIndex: 1}}>
                        <img className="team-user-img" src={avatarUrl(item.githubId)} title="" alt=""/>
                      </div>
                      <div className="bg-team">
                        <h6 className="team-name">{item.name}</h6>
                        <small>{getGitName(item.gitUrl)}</small>
                        <div>
                          <a className="team-link" href={item.gitUrl}>
                            <Github className="github-icon"/>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
            <h3 className="team_title">
              Contributors
            </h3>
            <span className="desc"><Translate>team.thanks</Translate></span>

            <div className="row" style={{marginTop: '20px', marginLeft: '20px'}}>
              <img src="https://contrib.rocks/image?repo=apache/hertzbeat" alt=''/>
            </div>

          </div>
        </Layout>;
      }}

    </BrowserOnly>

  );
}
