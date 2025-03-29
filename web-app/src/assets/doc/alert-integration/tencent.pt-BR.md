> Envie alarmes Tencent Cloud para a plataforma de alarme HertzBeat através do Webhook.

### Configurar retorno de chamada de alarme da Tencent Cloud

#### Insira a configuração do modelo de notificação

1. Faça login na [Tencent Cloud Observable Platform](https://console.cloud.tencent.com/monitorv2)
2. Entre em **Gerenciamento de alarmes** > **Configuração de alarmes** > **Modelo de notificação**
3. Clique em **Novo modelo de notificação**
4. Na página do novo modelo de notificação, preencha as informações básicas
5. No módulo **Interface Callback**, preencha o URL do endereço da interface do Webhook fornecido pela HertzBeat:
   ```
    http://{seu_sistema_host}/api/alerts/tencent
   ```

6. Salvar modelo de notificação

#### Vincular política de alarme

1. Entre na **Lista de Políticas de Alarme**
2. Selecione a política de alarme que precisa ser vinculada ao retorno de chamada do Webhook e clique no nome da política para entrar na página de gerenciamento.
3. No item de configuração do modelo de notificação, vincule o modelo de notificação criado na etapa anterior
4. Salve a configuração da política

### Perguntas frequentes

#### Nenhum alerta recebido

- Certifique-se de que o URL do Webhook possa ser acessado na rede pública
- Verifique o log do servidor para registros de solicitação
- Teste se o Webhook está disponível na página do modelo de notificação da Tencent Cloud

#### O alarme não é acionado

- Certifique-se de que as condições da política de alarme estejam corretas e que o modelo de notificação tenha sido vinculado
- Verifique o histórico de alarmes na página de monitoramento do Tencent Cloud para garantir que a política seja acionada

Para obter mais informações, consulte [Documento de configuração de alarme da Tencent Cloud](https://cloud.tencent.com/document/product/248/50409)
