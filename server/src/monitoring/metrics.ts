import client from "prom-client";

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code", "service"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

export const inFlightRequests = new client.Gauge({
  name: "http_in_flight_requests",
  help: "Number of in-flight HTTP requests",
  labelNames: ["service"],
});

export const dbQueryDuration = new client.Histogram({
  name: "db_query_duration_seconds",
  help: "Duration of DB queries in seconds",
  labelNames: ["model", "operation"],
  buckets: [0.0005, 0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

// /metrics route will return Prometheus format
export default client;
