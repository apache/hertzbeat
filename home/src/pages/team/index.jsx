import React from "react";
import BrowserOnly from "@docusaurus/BrowserOnly";
import config from "./data/member.json";
import avatar from "./data/github-avatar.json";
import allContributor from "./data/all-contributor.json";
import Layout from "@theme/Layout";
import "./index.css";
import Github from "./github.svg";
import AOS from "aos";
import "aos/dist/aos.css";
import Translate from "@docusaurus/Translate";

/**
 * Derived from https://github.com/apache/streampark-website/tree/dev/src/pages/team
 */
export default function () {
  const teamSrc = config;
  const avatarSrc = avatar;
  const allContributorSrc = allContributor;
  // refer to  https://github.com/all-contributors/cli/blob/master/src/util/contribution-types.js
  const contributionTypes = {
    a11y: "️️️️♿️",
    audio: "🔊",
    blog: "📝",
    bug: "🐛",
    business: "💼",
    code: "💻",
    content: "🖋",
    data: "🔣",
    design: "🎨",
    doc: "📖",
    eventOrganizing: "📋",
    example: "💡",
    financial: "💵",
    fundingFinding: "🔍",
    ideas: "🤔",
    infra: "🚇",
    maintenance: "🚧",
    mentoring: "🧑‍🏫",
    platform: "📦",
    plugin: "🔌",
    projectManagement: "📆",
    question: "💬",
    research: "🔬",
    review: "👀",
    security: "🛡️",
    talk: "📢",
    test: "⚠️",
    tool: "🔧",
    translation: "🌍",
    tutorial: "✅",
    userTesting: "📓",
    video: "📹",
    promotion: "📣"
  };

  function getGitName(url) {
    return "@" + url.replace("https://github.com/", "");
  }

  function avatarUrl(id) {
    const avatarObj = avatarSrc.find((item) => item.id === id);
    if (avatarObj) {
      return "data:image/png;base64," + avatarObj.avatar_base64;
    }
    return "";
  }

  function commitsUrl(author) {
    if (author) {
      return "https://github.com/apache/hertzbeat/commits?author=" + author;
    }
    return "";
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
        window.addEventListener("load", AOS.refresh);
        return (
          <Layout>
            <div className="team_page">
              <h2 style={{ marginTop: "50px" }}>
                <Translate>team.name</Translate>
              </h2>
              <hr style={{ maxWidth: "10rem" }}></hr>
              <p className="team_desc team_indent">
                <Translate>team.desc</Translate>
              </p>

              <h3 className="team_title">
                PMC
                <span className="desc">
                  <Translate>team.tip</Translate>
                </span>
              </h3>
              <div className="team-row">
                {teamSrc.pmc.map((item, i) => (
                  <div className="team-box" key={i} data-aos="fade-up" data-aos-delay={i * 100}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ overflow: "hidden", zIndex: 1 }}>
                        <img
                          className="team-user-img"
                          src={avatarUrl(item.githubId)}
                          title=""
                          alt=""
                        />
                      </div>
                      <div className="bg-team">
                        <h6 className="team-name">{item.name}</h6>
                        <small>{getGitName(item.gitUrl)}</small>
                        <div>
                          <a className="team-link" href={item.gitUrl} target="_blank" rel="noreferrer">
                            <Github className="github-icon" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="team_title">
                Committer
                <span className="desc">
                  <Translate>team.tip</Translate>
                </span>
              </h3>
              <div className="team-row">
                {teamSrc.committer.map((item, i) => (
                  <div className="team-box" key={i} data-aos="fade-up" data-aos-delay={i * 100}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ overflow: "hidden", zIndex: 1 }}>
                        <img
                          className="team-user-img"
                          src={avatarUrl(item.githubId)}
                          title=""
                          alt=""
                        />
                      </div>
                      <div className="bg-team">
                        <h6 className="team-name">{item.name}</h6>
                        <small>{getGitName(item.gitUrl)}</small>
                        <div>
                          <a className="team-link" href={item.gitUrl} target="_blank" rel="noreferrer">
                            <Github className="github-icon" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <h3 className="team_title">Contributor</h3>
              <span className="desc">
                <Translate>team.thanks</Translate>
              </span>
              <div className="contributor-grid">
                {allContributorSrc.map((item, i) => (
                  <div className="contributor-column" key={i}>
                    <img
                      className="contributor-avatar"
                      src={avatarUrl(item.githubId)}
                      title=""
                      alt=""
                    />
                    <div className="contributor-name">
                      <a href={item.profile} target="_blank" rel="noreferrer">{item.name}</a>
                    </div>
                    <div className="contributor-type">
                      <a href={commitsUrl(item.login)} target="_blank" rel="noreferrer">
                        {item.contributions.map((c, ci) => (
                          <span>{contributionTypes[c]}</span>
                        ))}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Layout>
        );
      }}
    </BrowserOnly>
  );
}
