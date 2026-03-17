# Monitoring & Logging

## Monitoring
- Use CloudWatch, Datadog, or Elastic for system health and performance metrics.
- Track API errors, latency, throughput, and uptime.

## Logging
- Centralize logs from all containers (stdout, stderr).
- Use log aggregation tools (e.g., ELK stack, Loki, Datadog).

## Steps
1. Install monitoring agent in each container or host.
2. Configure log shipping to aggregation service.
3. Set up alerts for API errors and system health.
4. Visualize metrics in dashboards.
