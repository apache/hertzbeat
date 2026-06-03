> Envie os alertas do Volcano Engine Cloud Monitoring para a plataforma de alertas da HertzBeat via Webhook.

### Configurar o retorno de chamada de alarme do Volcano Engine

1. Acesse o Volcano Engine Cloud Monitoring [Página de Gerenciamento de Endereços de Retorno de Chamada](https://console.volcengine.com/cloud-monitor/notice/webhook)

2. Clique em **Criar endereço de retorno de chamada**

3. Preencha as informações básicas na página de criação de endereço de retorno de chamada e selecione `Retorno de chamada de endereço geral` para o tipo de retorno.

4. Preencha a URL do endereço da interface do Webhook fornecida pela HertzBeat na caixa de entrada de endereço de retorno de chamada:

```
http://{host_do_seu_sistema}/api/alerts/report/volcengine
```

### Vincular estratégia de alarme

1. Acesse o Volcano Engine Cloud Monitoring [Página de Configuração da Estratégia de Alarme](https://console.volcengine.com/cloud-monitor/alert/strategy)

2. Crie uma nova estratégia ou edite uma existente na configuração do método de alarme.

   - Selecione o método de notificação como **Manual notificação**

   - Verifique o **Retorno de chamada de alarme** para o canal de alarme

   - Selecione o endereço de retorno de chamada criado na etapa anterior no retorno de chamada de alarme

3. Salvar política de alarme
### Perguntas frequentes

#### Alarme não recebido
- Certifique-se de que a URL do Webhook esteja acessível à rede pública
- Verifique o log do servidor para registros de solicitações
- Teste se o Webhook está disponível na página de endereço de retorno de chamada do Volcano Engine

#### Alarme não disparado
- Certifique-se de que as condições da política de alarme estejam corretas e vincule o endereço de retorno de chamada correto como canal de notificação
- Certifique-se de que a política de alarme esteja no estado `habilitado`
- Verifique o histórico de alarmes no Console de Monitoramento em Nuvem do Volcano Engine para garantir que a política seja disparada

Para obter mais informações, consulte o [Documento de Configuração de Alarme do Volcano Engine](https://www.volcengine.com/docs/6408/68122)
