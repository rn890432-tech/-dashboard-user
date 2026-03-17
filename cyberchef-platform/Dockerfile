FROM nginx:1.27-alpine

# Minimal production web container placeholder until the dashboard app pipeline is wired.
RUN rm -rf /usr/share/nginx/html/* \
  && printf '%s\n' \
    '<!doctype html>' \
    '<html lang="en">' \
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CyberChef Platform</title></head>' \
    '<body style="font-family:Arial,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">' \
    '<main style="text-align:center;padding:24px">' \
    '<h1 style="margin:0 0 8px">CyberChef Platform</h1>' \
    '<p style="margin:0">Web container is running in production mode.</p>' \
    '</main>' \
    '</body></html>' \
    > /usr/share/nginx/html/index.html

EXPOSE 80
