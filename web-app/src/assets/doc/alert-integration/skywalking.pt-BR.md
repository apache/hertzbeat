> Envie alarmes de caminhada para a plataforma de alarme Hertzbeat através do Webhook.

Configuração do Serviço de Skywalking

- Editar Arquivo de Configuração do Skywalking `alarm-settings.yml`, adicione HertzBeat como a configuração do receptor de alarme.

```yaml
hooks:
  webhook:
    default:
      is-default: true
      urls:
        - http://{hertzbeat_host}:1157/api/alerts/report/skywalking
```

- `http://{hertzbeat_host}:1157/api/alerts/report/skywalking` webhook Endereço de interface fornecido para hertzbeat.
- Recarregue o Skywalking OAP Server

### Verifique a configuração

1. Certifique -se de que o Skyking esteja configurado corretamente e recarregue a configuração
2. Verifique o status da regra do alarme de caminhada no céu
3. Aproveite o alarme de teste e veja -o no HertzBeat Alarm Center

### Perguntas frequentes

- Verifique se o URL do Hertzbeat está acessível pelo Skywalking Server
- Verifique o registro do Skywalking para obter mensagens de erro que falharam em enviar alarmes
- Verifique a correção da expressão da regra do alarme

Para obter mais informações, consulte o [Documento de configuração de alarme de Skywalking] (https://skywalking.apache.org/docs/main/latest/en/setup/backend/backend-alarm/)
