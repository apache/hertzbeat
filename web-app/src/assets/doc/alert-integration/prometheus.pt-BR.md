> Você pode configurar diretamente o endereço de serviço do HertzBeat na configuração do alertManager do servidor Prometheus e usar o HertzBeat para substituir o alertManager para receber diretamente e processar as informações de alarme do servidor Prometheus.

### Configuração do Servidor Prometheus

- Edite o arquivo de configuração do Prometheus `prometheus.yml` e adicione o HertzBeat como receptor de alertas:

```yaml
# Configuração do Alertmanager
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - { hertzbeat_host }:1157
      authorization:
        type: 'Bearer'
        credentials: '{token}'

```

- `{hertzbeat_host}:1157` é o endereço e a porta do servidor HertzBeat. Modifique-o de acordo com a situação real e garanta a conectividade da rede.
- `{token}`é o Token de autorização do HertzBeat Server (substitua pelo novo Token gerado)
- Reinicie o servidor Prometheus

## Verifique a configuração

1. Certifique -se de que o prometeu esteja configurado corretamente e recarregue a configuração
    ```bash
    curl -X POST http://localhost:9090/-/reload
    ```
2. Verifique o status da regra do alarme de Prometheus
    ```bash
    curl http://localhost:9090/api/v1/rules
    ```
3. Acione alertas de teste e visualize-os no HertzBeat Alert Center

## Perguntas frequentes

- Verifique se o URL do Hertzbeat está acessível pelo servidor Prometheus
- Verifique o log do Prometheus para mensagens de erro que falharam em enviar alarmes
- Verifique a correção da expressão da regra do alarme

Para obter mais informações, consulte [o arquivo de configuração de alarme Prometheus] (https://prometheus.io/docs/alerting/latest/configuration/)
