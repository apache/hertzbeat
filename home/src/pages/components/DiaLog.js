import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Button } from '@douyinfe/semi-ui';
import Translate from '@docusaurus/Translate'

// from rainbond: https://github.com/goodrain/rainbond-docs/blob/main/src/components/DiaLog/index.tsx
export default function DiaLog() {
  const [Visible, setVisible] = useState(false);
  const handleCancel = useCallback(() => {
    setVisible(false);
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem("support-hertzbeat") == null) {
      setTimeout(() => {
        setVisible(true);
      }, 10);
      sessionStorage.setItem("support-hertzbeat", true);
    }
  }, []);

  return (
      <>
        <Modal
          title={
            <p style={{ fontSize: "22px" }}><Translate>support hertzbeat</Translate></p>
          }
          visible={Visible}
          // onOk={handleOk}
          onCancel={handleCancel}
          centered
          bodyStyle={{overflow: 'auto'}}
          maskClosable={false}
          style={{width: "600px", fontSize: "17px"}}
          icon={
            <img src="/img/tancloud-logo.svg" alt="logo" />
          }
          footer={
            <div>
              <p style={{paddingRight: "20px"}}>
                👇  <b style={{ color: "#26B226"}}><Translate>click</Translate></b>
              </p>
              <a href="https://github.com/dromara/hertzbeat" target="_blank">
                <Button type="primary" theme="solid">
                  <Translate>go github</Translate>
                </Button>
              </a>
            </div>
          }>
          <p style={{lineHeight: 1.5}}>
            <Translate>If you like HertzBeat, give us a star on GitHub</Translate>
          </p>
          <p style={{lineHeight: 1.5}}>
            <Translate>We will grow better with your support.</Translate>
          </p>
        </Modal>
      </>
  );

}
