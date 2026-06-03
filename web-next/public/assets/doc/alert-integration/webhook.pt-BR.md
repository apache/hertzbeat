> Hertzbeat fornece uma interface de API para o mundo exterior. Os sistemas externos podem chamar essa interface através do webhook para empurrar dados de alarme para a plataforma de alarme Hertzbeat.

### Interface endpoint

`POST /api/alerts/report`

### Cabeçalho de solicitação

- `Content-Type`: `application/json`
- `Authorization`: `Bearer {token}`

### Solicite corpo

```json
{
  "labels": {
    "alertname": "HighCPUUsage",
    "priority": "critical",
    "instance": "343483943"
  },
  "annotations": {
    "summary": "High CPU usage detected"
  },
  "content": "The CPU usage on instance 343483943 is critically high.",
  "status": "firing",
  "triggerTimes": 3,
  "startAt": 1736580031832,
  "activeAt": 1736580039832,
  "endAt": null
}
```

Descrição do campo

- `labels` : etiqueta de alarme
- `alertname`: nome da regra de alerta
- `priority`: nível de aviso (aviso, crítico)
- `instance`: instância de alarme
- `annotations`: Informações do comentário de alarme
- `summary`: Resumo do alarme
- `description`: Descrição detalhada do alarme
- `content`: conteúdo de alarme
- `status`: status do alarme (disparando, resolvido)
- `triggerTimes`: Número de acionadores de alarme
- `startAt`: tempo de início do alarme
- `activeAt`: tempo de ativação do alarme
- `endAt`: Hora final do alarme

### Verificação de configuração

- Depois que o sistema de terceiros aciona um alarme, os dados de alarme são empurrados para a plataforma de alarme Hertzbeat através da interface `/API/Alerts/Relatório 'do Webhook.
- Verifique o processamento de dados de alarme na plataforma de alarme HertzBeat para verificar se os dados do alarme estão corretos.

### Fluxo de dados:

```mermaid
graph LR
    A [Alarme do sistema externo] -> B [webhook]
    B -> C [Plataforma de alarme Hertzbeat]
    C -> D [Convergência do grupo]
    D -> e [supressão de alarme]
    E -> f [alarme silencioso]
    F -> g [centro de alarme]
    F -> H [distribuição de mensagens]
```

### Perguntas frequentes

- Verifique se o URL do HertzBeat pode ser acessado por servidores de sistema de terceiros.
- Verifique se existem mensagens no log do sistema de terceiros que não enviaram o alarme.
