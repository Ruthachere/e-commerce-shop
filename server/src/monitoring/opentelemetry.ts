const { NodeSDK } = require("@opentelemetry/sdk-node");
const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const { PrometheusExporter } = require("@opentelemetry/exporter-prometheus");

const exporter = new PrometheusExporter({ port: 9464 });

new NodeSDK({
  traceExporter: exporter,
  instrumentations: [getNodeAutoInstrumentations()],
}).start();
