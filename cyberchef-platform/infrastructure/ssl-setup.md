# SSL Security Setup

## Automatic Certificate Generation
- Use certbot (Let's Encrypt) for SSL certificates.
- Configure Nginx for HTTPS.

## Steps
1. Install certbot in your container host.
2. Run:
   certbot --nginx -d cyberchef.ai -d www.cyberchef.ai
3. Certbot will update Nginx config for SSL.
4. Set up certbot renewal:
   certbot renew --dry-run
5. Mount /etc/letsencrypt in Nginx container for certificate access.

## Nginx HTTPS Example
```
server {
    listen 443 ssl;
    server_name cyberchef.ai;
    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;
    ...
}
```
