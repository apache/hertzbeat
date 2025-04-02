"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[72241],{15680:(e,t,a)=>{a.d(t,{xA:()=>p,yg:()=>g});var n=a(96540);function i(e,t,a){return t in e?Object.defineProperty(e,t,{value:a,enumerable:!0,configurable:!0,writable:!0}):e[t]=a,e}function r(e,t){var a=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),a.push.apply(a,n)}return a}function l(e){for(var t=1;t<arguments.length;t++){var a=null!=arguments[t]?arguments[t]:{};t%2?r(Object(a),!0).forEach((function(t){i(e,t,a[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(a)):r(Object(a)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(a,t))}))}return e}function o(e,t){if(null==e)return{};var a,n,i=function(e,t){if(null==e)return{};var a,n,i={},r=Object.keys(e);for(n=0;n<r.length;n++)a=r[n],t.indexOf(a)>=0||(i[a]=e[a]);return i}(e,t);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);for(n=0;n<r.length;n++)a=r[n],t.indexOf(a)>=0||Object.prototype.propertyIsEnumerable.call(e,a)&&(i[a]=e[a])}return i}var s=n.createContext({}),c=function(e){var t=n.useContext(s),a=t;return e&&(a="function"==typeof e?e(t):l(l({},t),e)),a},p=function(e){var t=c(e.components);return n.createElement(s.Provider,{value:t},e.children)},h={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},d=n.forwardRef((function(e,t){var a=e.components,i=e.mdxType,r=e.originalType,s=e.parentName,p=o(e,["components","mdxType","originalType","parentName"]),d=c(a),g=i,y=d["".concat(s,".").concat(g)]||d[g]||h[g]||r;return a?n.createElement(y,l(l({ref:t},p),{},{components:a})):n.createElement(y,l({ref:t},p))}));function g(e,t){var a=arguments,i=t&&t.mdxType;if("string"==typeof e||i){var r=a.length,l=new Array(r);l[0]=d;var o={};for(var s in t)hasOwnProperty.call(t,s)&&(o[s]=t[s]);o.originalType=e,o.mdxType="string"==typeof e?e:i,l[1]=o;for(var c=2;c<r;c++)l[c]=a[c];return n.createElement.apply(null,l)}return n.createElement.apply(null,a)}d.displayName="MDXCreateElement"},55004:(e,t,a)=>{a.r(t),a.d(t,{assets:()=>s,contentTitle:()=>l,default:()=>h,frontMatter:()=>r,metadata:()=>o,toc:()=>c});var n=a(58168),i=(a(96540),a(15680));const r={id:"how_to_verify_release",title:"How to Verify Release",sidebar_position:4},l=void 0,o={unversionedId:"community/how_to_verify_release",id:"version-v1.6.x/community/how_to_verify_release",title:"How to Verify Release",description:"Verify the candidate version",source:"@site/versioned_docs/version-v1.6.x/community/how-to-verify.md",sourceDirName:"community",slug:"/community/how_to_verify_release",permalink:"/docs/v1.6.x/community/how_to_verify_release",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/versioned_docs/version-v1.6.x/community/how-to-verify.md",tags:[],version:"v1.6.x",sidebarPosition:4,frontMatter:{id:"how_to_verify_release",title:"How to Verify Release",sidebar_position:4},sidebar:"docs",previous:{title:"How to Release",permalink:"/docs/v1.6.x/community/how_to_release"},next:{title:"Related resources",permalink:"/docs/v1.6.x/others/resource"}},s={},c=[{value:"Verify the candidate version",id:"verify-the-candidate-version",level:2},{value:"1. Download the candidate version",id:"1-download-the-candidate-version",level:3},{value:"2. Verify that the uploaded version is compliant",id:"2-verify-that-the-uploaded-version-is-compliant",level:3},{value:"2.1 Check whether the release package is complete",id:"21-check-whether-the-release-package-is-complete",level:4},{value:"2.2 Check gpg signature",id:"22-check-gpg-signature",level:4},{value:"2.2.1 Import public key",id:"221-import-public-key",level:5},{value:"2.2.2 Trust the public key",id:"222-trust-the-public-key",level:5},{value:"2.2.3 Check the gpg signature",id:"223-check-the-gpg-signature",level:5},{value:"2.3 Check sha512 hash",id:"23-check-sha512-hash",level:4},{value:"2.4 Check the binary package",id:"24-check-the-binary-package",level:4},{value:"2.5 Check the source package",id:"25-check-the-source-package",level:4},{value:"3. Email reply",id:"3-email-reply",level:3}],p={toc:c};function h(e){let{components:t,...a}=e;return(0,i.yg)("wrapper",(0,n.A)({},p,a,{components:t,mdxType:"MDXLayout"}),(0,i.yg)("h2",{id:"verify-the-candidate-version"},"Verify the candidate version"),(0,i.yg)("p",null,"For detailed check list, please refer to the official ",(0,i.yg)("a",{parentName:"p",href:"https://cwiki.apache.org/confluence/display/INCUBATOR/Incubator+Release+Checklist"},"check list")),(0,i.yg)("p",null,"Version content accessible in browser ",(0,i.yg)("a",{parentName:"p",href:"https://dist.apache.org/repos/dist/dev/incubator/hertzbeat/"},"https://dist.apache.org/repos/dist/dev/incubator/hertzbeat/")),(0,i.yg)("h3",{id:"1-download-the-candidate-version"},"1. Download the candidate version"),(0,i.yg)("p",null,"Download the candidate version to be released to the local environment Need to rely on gpg tool, if not, it is recommended to install ",(0,i.yg)("inlineCode",{parentName:"p"},"gpg2"),"."),(0,i.yg)("admonition",{type:"caution"},(0,i.yg)("p",{parentName:"admonition"},"If the network is poor, downloading may be time-consuming. The download is completed normally in about 20 minutes, please wait patiently.")),(0,i.yg)("pre",null,(0,i.yg)("code",{parentName:"pre",className:"language-shell"},"#If there is svn locally, you can clone to the local\n$ svn co https://dist.apache.org/repos/dist/dev/incubator/hertzbeat/${release_version}-${rc_version}/\n#or download the material file directly\n$ wget https://dist.apache.org/repos/dist/dev/incubator/hertzbeat/${release_version}-${rc_version}/xxx.xxx\n")),(0,i.yg)("h3",{id:"2-verify-that-the-uploaded-version-is-compliant"},"2. Verify that the uploaded version is compliant"),(0,i.yg)("p",null,"Start the verification process, which includes but is not limited to the following content and forms."),(0,i.yg)("h4",{id:"21-check-whether-the-release-package-is-complete"},"2.1 Check whether the release package is complete"),(0,i.yg)("p",null,"The package uploaded to dist must include the source code package, and the binary package is optional."),(0,i.yg)("ol",null,(0,i.yg)("li",{parentName:"ol"},"Whether to include the source code package"),(0,i.yg)("li",{parentName:"ol"},"Whether to include the signature of the source code package"),(0,i.yg)("li",{parentName:"ol"},"Whether to include the sha512 of the source code package"),(0,i.yg)("li",{parentName:"ol"},"If the binary package is uploaded, also check the contents listed in (2)-(4)")),(0,i.yg)("h4",{id:"22-check-gpg-signature"},"2.2 Check gpg signature"),(0,i.yg)("p",null,"First import the publisher's public key. Import KEYS from the svn repository to the local environment. (The person who releases the version does not need to import it again, the person who helps to do the verification needs to import it, and the user name is enough for the person who issued the version)"),(0,i.yg)("h5",{id:"221-import-public-key"},"2.2.1 Import public key"),(0,i.yg)("pre",null,(0,i.yg)("code",{parentName:"pre",className:"language-shell"},"curl  https://downloads.apache.org/incubator/hertzbeat/KEYS > KEYS # Download KEYS\ngpg --import KEYS # Import KEYS to local\n")),(0,i.yg)("h5",{id:"222-trust-the-public-key"},"2.2.2 Trust the public key"),(0,i.yg)("p",null,"Trust the KEY used in this version:"),(0,i.yg)("pre",null,(0,i.yg)("code",{parentName:"pre",className:"language-shell"},"$ gpg --edit-key xxxxxxxxxx #KEY user used in this version\ngpg (GnuPG) 2.2.21; Copyright (C) 2020 Free Software Foundation, Inc.\nThis is free software: you are free to change and redistribute it.\nThere is NO WARRANTY, to the extent permitted by law.\n\nSecret key is available.\ngpg> trust #trust\nPlease decide how far you trust this user to correctly verify other users' keys\n(by looking at passports, checking fingerprints from different sources, etc.)\n\n  1 = I don't know or won't say\n  2 = I do NOT trust\n  3 = I trust marginally\n  4 = I trust fully\n  5 = I trust ultimately\n  m = back to the main menu\n\nYour decision? 5 #choose 5\nDo you really want to set this key to ultimate trust? (y/N) y  #choose y\n                                                            \ngpg>\n         \n")),(0,i.yg)("h5",{id:"223-check-the-gpg-signature"},"2.2.3 Check the gpg signature"),(0,i.yg)("pre",null,(0,i.yg)("code",{parentName:"pre",className:"language-shell"},"for i in *.tar.gz; do echo $i; gpg --verify $i.asc $i; done\n")),(0,i.yg)("p",null,"check result"),(0,i.yg)("blockquote",null,(0,i.yg)("p",{parentName:"blockquote"},"If something like the following appears, it means the signature is correct. Keyword: ",(0,i.yg)("strong",{parentName:"p"},(0,i.yg)("inlineCode",{parentName:"strong"},"Good signature")))),(0,i.yg)("pre",null,(0,i.yg)("code",{parentName:"pre",className:"language-shell"},'apache-hertzbeat-xxx-incubating-src.tar.gz\ngpg: Signature made XXXX\ngpg: using RSA key XXXXX\ngpg: Good signature from "xxx @apache.org>"\n')),(0,i.yg)("h4",{id:"23-check-sha512-hash"},"2.3 Check sha512 hash"),(0,i.yg)("pre",null,(0,i.yg)("code",{parentName:"pre",className:"language-shell"},"for i in *.tar.gz; do echo $i; sha512sum --check  $i.sha512; done\n")),(0,i.yg)("h4",{id:"24-check-the-binary-package"},"2.4 Check the binary package"),(0,i.yg)("p",null,"unzip  ",(0,i.yg)("inlineCode",{parentName:"p"},"apache-hertzbeat-${release.version}-incubating-bin.tar.gz")),(0,i.yg)("pre",null,(0,i.yg)("code",{parentName:"pre",className:"language-shell"},"tar -xzvf apache-hertzbeat-${release.version}-incubating-bin.tar.gz\n")),(0,i.yg)("p",null,"check as follows:"),(0,i.yg)("ul",{className:"contains-task-list"},(0,i.yg)("li",{parentName:"ul",className:"task-list-item"},(0,i.yg)("input",{parentName:"li",type:"checkbox",checked:!1,disabled:!0})," ","Check whether the source package contains unnecessary files, which makes the tar package too large"),(0,i.yg)("li",{parentName:"ul",className:"task-list-item"},(0,i.yg)("input",{parentName:"li",type:"checkbox",checked:!1,disabled:!0})," ","Folder contains the word ",(0,i.yg)("inlineCode",{parentName:"li"},"incubating")),(0,i.yg)("li",{parentName:"ul",className:"task-list-item"},(0,i.yg)("input",{parentName:"li",type:"checkbox",checked:!1,disabled:!0})," ","There are ",(0,i.yg)("inlineCode",{parentName:"li"},"LICENSE")," and ",(0,i.yg)("inlineCode",{parentName:"li"},"NOTICE")," files"),(0,i.yg)("li",{parentName:"ul",className:"task-list-item"},(0,i.yg)("input",{parentName:"li",type:"checkbox",checked:!1,disabled:!0})," ","There is a ",(0,i.yg)("inlineCode",{parentName:"li"},"DISCLAIMER")," or ",(0,i.yg)("inlineCode",{parentName:"li"},"DISCLAIMER-WIP")," file"),(0,i.yg)("li",{parentName:"ul",className:"task-list-item"},(0,i.yg)("input",{parentName:"li",type:"checkbox",checked:!1,disabled:!0})," ","The year in the ",(0,i.yg)("inlineCode",{parentName:"li"},"NOTICE")," file is correct"),(0,i.yg)("li",{parentName:"ul",className:"task-list-item"},(0,i.yg)("input",{parentName:"li",type:"checkbox",checked:!1,disabled:!0})," ","Only text files exist, not binary files"),(0,i.yg)("li",{parentName:"ul",className:"task-list-item"},(0,i.yg)("input",{parentName:"li",type:"checkbox",checked:!1,disabled:!0})," ","All files have ASF license at the beginning"),(0,i.yg)("li",{parentName:"ul",className:"task-list-item"},(0,i.yg)("input",{parentName:"li",type:"checkbox",checked:!1,disabled:!0})," ","Able to compile correctly"),(0,i.yg)("li",{parentName:"ul",className:"task-list-item"},(0,i.yg)("input",{parentName:"li",type:"checkbox",checked:!1,disabled:!0})," ",".....")),(0,i.yg)("h4",{id:"25-check-the-source-package"},"2.5 Check the source package"),(0,i.yg)("blockquote",null,(0,i.yg)("p",{parentName:"blockquote"},"If the binary/web-binary package is uploaded, check the binary package.")),(0,i.yg)("p",null,"Unzip ",(0,i.yg)("inlineCode",{parentName:"p"},"apache-hertzbeat-${release_version}-incubating-src.tar.gz")),(0,i.yg)("pre",null,(0,i.yg)("code",{parentName:"pre",className:"language-shell"},"cd apache-hertzbeat-${release_version}-incubating-src\n")),(0,i.yg)("p",null,"compile the source code: ",(0,i.yg)("a",{parentName:"p",href:"https://hertzbeat.apache.org/docs/community/development/#build-hertzbeat-binary-package"},"Build HertzBeat Binary Package")),(0,i.yg)("p",null,"and check as follows:"),(0,i.yg)("ul",{className:"contains-task-list"},(0,i.yg)("li",{parentName:"ul",className:"task-list-item"},(0,i.yg)("input",{parentName:"li",type:"checkbox",checked:!1,disabled:!0})," ","There are ",(0,i.yg)("inlineCode",{parentName:"li"},"LICENSE")," and ",(0,i.yg)("inlineCode",{parentName:"li"},"NOTICE")," files"),(0,i.yg)("li",{parentName:"ul",className:"task-list-item"},(0,i.yg)("input",{parentName:"li",type:"checkbox",checked:!1,disabled:!0})," ","There is a ",(0,i.yg)("inlineCode",{parentName:"li"},"DISCLAIMER")," or ",(0,i.yg)("inlineCode",{parentName:"li"},"DISCLAIMER-WIP")," file"),(0,i.yg)("li",{parentName:"ul",className:"task-list-item"},(0,i.yg)("input",{parentName:"li",type:"checkbox",checked:!1,disabled:!0})," ","The year in the ",(0,i.yg)("inlineCode",{parentName:"li"},"NOTICE")," file is correct"),(0,i.yg)("li",{parentName:"ul",className:"task-list-item"},(0,i.yg)("input",{parentName:"li",type:"checkbox",checked:!1,disabled:!0})," ","All text files have ASF license at the beginning"),(0,i.yg)("li",{parentName:"ul",className:"task-list-item"},(0,i.yg)("input",{parentName:"li",type:"checkbox",checked:!1,disabled:!0})," ","Check the third-party dependent license:"),(0,i.yg)("li",{parentName:"ul",className:"task-list-item"},(0,i.yg)("input",{parentName:"li",type:"checkbox",checked:!1,disabled:!0})," ","Compatible with third-party dependent licenses"),(0,i.yg)("li",{parentName:"ul",className:"task-list-item"},(0,i.yg)("input",{parentName:"li",type:"checkbox",checked:!1,disabled:!0})," ","All third-party dependent licenses are named in the ",(0,i.yg)("inlineCode",{parentName:"li"},"LICENSE")," file"),(0,i.yg)("li",{parentName:"ul",className:"task-list-item"},(0,i.yg)("input",{parentName:"li",type:"checkbox",checked:!1,disabled:!0})," ","If you are relying on the Apache license and there is a ",(0,i.yg)("inlineCode",{parentName:"li"},"NOTICE")," file, then these ",(0,i.yg)("inlineCode",{parentName:"li"},"NOTICE")," files also need to be added to the version of the ",(0,i.yg)("inlineCode",{parentName:"li"},"NOTICE")," file"),(0,i.yg)("li",{parentName:"ul",className:"task-list-item"},(0,i.yg)("input",{parentName:"li",type:"checkbox",checked:!1,disabled:!0})," ",".....")),(0,i.yg)("p",null,"You can refer to this article: ",(0,i.yg)("a",{parentName:"p",href:"https://apache.org/legal/resolved.html"},"ASF Third Party License Policy")),(0,i.yg)("h3",{id:"3-email-reply"},"3. Email reply"),(0,i.yg)("p",null,"If you initiate a posting vote, you can refer to this response example to reply to the email after verification"),(0,i.yg)("font",{color:"red"},"When replying to the email, you must bring the information that you have checked by yourself. Simply replying to `+1 approve` is invalid.",(0,i.yg)("p",null,"When PPMC votes in the ",(0,i.yg)("a",{parentName:"p",href:"mailto:dev@hertzbeat.apache.org"},"dev@hertzbeat.apache.org")," hertzbeat community, Please bring the binding suffix to indicate that it has a binding vote for the vote in the hertzbeat community, and it is convenient to count the voting results."),(0,i.yg)("p",null,"When IPMC votes in the ",(0,i.yg)("a",{parentName:"p",href:"mailto:general@incubator.apache.org"},"general@incubator.apache.org")," incubator community. Please bring the binding suffix to indicate that the voting in the incubator community has a binding vote, which is convenient for counting the voting results.")),(0,i.yg)("admonition",{type:"caution"},(0,i.yg)("p",{parentName:"admonition"},"If you have already voted on ",(0,i.yg)("a",{parentName:"p",href:"mailto:dev@hertzbeat.apache.org"},"dev@hertzbeat.apache.org"),", you can take it directly to the incubator community when you reply to the vote, such as:"),(0,i.yg)("pre",{parentName:"admonition"},(0,i.yg)("code",{parentName:"pre",className:"language-html"},"//Incubator community voting, only IPMC members have binding binding\uff0cPPMC needs to be aware of binding changes\nForward my +1 from dev@listhertzbeatnkis (non-binding)\nCopy my +1 from hertzbeat DEV ML (non-binding)\n"))),(0,i.yg)("p",null,"Non-PPMC/Non-IPMC member:"),(0,i.yg)("pre",null,(0,i.yg)("code",{parentName:"pre",className:"language-text"},"+1 (non-binding)\nI checked:\n     1. All download links are valid\n     2. Checksum and signature are OK\n     3. LICENSE and NOTICE are exist\n     4. Build successfully on macOS(Big Sur)\n     5. \n")),(0,i.yg)("p",null,"PPMC/IPMC member:"),(0,i.yg)("pre",null,(0,i.yg)("code",{parentName:"pre",className:"language-text"},"//Incubator community voting, only IPMC members have binding binding\n+1 (binding)\nI checked:\n     1. All download links are valid\n     2. Checksum and signature are OK\n     3. LICENSE and NOTICE are exist\n     4. Build successfully on macOS(Big Sur)\n     5. \n")),(0,i.yg)("hr",null),(0,i.yg)("p",null,"This doc refer from ",(0,i.yg)("a",{parentName:"p",href:"https://streampark.apache.org/"},"Apache StreamPark")))}h.isMDXComponent=!0}}]);