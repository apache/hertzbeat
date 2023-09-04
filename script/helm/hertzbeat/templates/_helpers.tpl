{{/*
Expand the name of the chart.
*/}}
{{- define "hertzbeat.name" -}}
{{- default .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "hertzbeat.fullname" -}}
{{- $name := default .Chart.Name }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{- define "hertzbeat.manager" -}}
{{- printf "%s" (include "hertzbeat.fullname" .) -}}
{{- end -}}

{{- define "hertzbeat.manager.host" -}}
{{- printf "%s-cluster" (include "hertzbeat.manager" .) -}}
{{- end -}}

{{- define "hertzbeat.collector" -}}
{{- printf "%s-collector" (include "hertzbeat.fullname" .) -}}
{{- end -}}

{{- define "hertzbeat.database" -}}
{{- printf "%s-database" (include "hertzbeat.fullname" .) -}}
{{- end -}}

{{- define "hertzbeat.tsdb" -}}
{{- printf "%s-tsdb" (include "hertzbeat.fullname" .) -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "hertzbeat.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "hertzbeat.labels" -}}
helm.sh/chart: {{ include "hertzbeat.chart" . }}
{{ include "hertzbeat.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "hertzbeat.selectorLabels" -}}
app.kubernetes.io/name: {{ include "hertzbeat.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
