>SkyWalking のアラートを Webhook 方式で HertzBeat アラートプラットフォームに送信します。

### SkyWalking の設定

- SkyWalking 設定ファイル `alarm-settings.yml` を編集、HertzBeat をアラート受信先として設定します。
```yaml
hooks:
  webhook:
    default:
      is-default: true
      urls:
        - http://{hertzbeat_host}:1157/api/alerts/report/skywalking
```
- `http://{hertzbeat_host}:1157/api/alerts/report/skywalking` は、 HertzBeat が提供する Webhook インターフェースです。
- SkyWalking OAP Server を再起動してください。

### 設定の検証

1. SkyWalking の設定が正しいことを確認し、設定を再読み込みしてください。
2. SkyWalkingアラートルールの状態を確認する。
3. テストアラートをトリガーし、HertzBeatアラートセンターで表示を確認する。


### FAQ

- SkyWalkingサーバーからHertzBeatのURLへアクセス可能であること。
- SkyWalkingログ内にアラート送信失敗のエラーメッセージがないか確認する。
- アラートルールの式が正しいことを検証する。

詳細情報は [SkyWalkingアラート設定ドキュメント](https://skywalking.apache.org/docs/main/latest/en/setup/backend/backend-alarm/)
