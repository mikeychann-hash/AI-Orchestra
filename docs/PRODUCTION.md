# AI Orchestra - Production Deployment Guide

Complete guide for deploying AI Orchestra to production with SSL/TLS, monitoring, and CI/CD.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Server Setup](#server-setup)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Production Deployment](#production-deployment)
- [CI/CD Setup](#cicd-setup)
- [Monitoring & Alerts](#monitoring--alerts)
- [Backup & Restore](#backup--restore)
- [Maintenance](#maintenance)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Server Requirements

- **OS**: Ubuntu 20.04+ / Debian 11+ / RHEL 8+
- **CPU**: Minimum 4 cores (8+ recommended)
- **RAM**: Minimum 8GB (16GB+ recommended)
- **Disk**: Minimum 100GB SSD
- **Network**: Static IP address, domain name configured

### Software Requirements

- Docker 20.10+
- Docker Compose 2.0+
- Git
- OpenSSL
- Certbot (for Let's Encrypt)

### Domain & DNS

- Domain name pointing to server IP
- DNS A record configured
- Firewall ports 80, 443 open

---

## Server Setup

### 1. Initial Server Configuration

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y \
    docker.io \
    docker-compose \
    git \
    curl \
    wget \
    openssl \
    certbot

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in for group changes to take effect
```

### 2. Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/AI-Orchestra.git
cd AI-Orchestra

# Checkout production branch
git checkout main
```

### 3. Configure Environment

```bash
# Copy production environment template
cp .env.production.example .env

# Edit configuration
nano .env

# Set strong passwords for:
# - DATABASE_PASSWORD
# - REDIS_PASSWORD
# - GRAFANA_PASSWORD
# - JWT_SECRET
# - API_KEY

# Add API keys:
# - OPENAI_API_KEY
# - GROK_API_KEY (if using)
# - GITHUB_TOKEN

# Update domain:
# - DOMAIN=yourdomain.com
# - CORS_ORIGIN=https://yourdomain.com
```

### 4. Create Volume Directories

```bash
# Create required directories
mkdir -p volumes/{database,logs/{nginx,application},artifacts,backups/postgres}

# Set permissions
chmod -R 755 volumes
```

---

## SSL/TLS Configuration

### Option 1: Let's Encrypt (Recommended)

```bash
# Run SSL setup script
sudo ./scripts/setup-ssl.sh

# When prompted, enter:
# - Your domain name
# - Your email address
# - Choose standalone or webroot mode
```

The script will:
- Install Certbot
- Obtain SSL certificates
- Configure auto-renewal
- Update Nginx configuration

### Option 2: Custom Certificates

If you have your own certificates:

```bash
# Copy certificates to nginx/ssl/
cp your-fullchain.pem nginx/ssl/fullchain.pem
cp your-privkey.pem nginx/ssl/privkey.pem
cp your-chain.pem nginx/ssl/chain.pem

# Set permissions
chmod 600 nginx/ssl/privkey.pem
chmod 644 nginx/ssl/fullchain.pem nginx/ssl/chain.pem
```

### SSL Certificate Renewal

Certificates auto-renew via cron job:

```bash
# View renewal cron job
crontab -l | grep ssl-renewal

# Manual renewal
sudo /usr/local/bin/renew-ai-orchestra-ssl.sh

# Test renewal (dry run)
sudo certbot renew --dry-run
```

---

## Production Deployment

### 1. Pre-Deployment Checklist

- ✅ Environment variables configured
- ✅ SSL certificates installed
- ✅ Domain DNS configured
- ✅ Firewall rules set (ports 80, 443)
- ✅ Backup strategy planned
- ✅ Monitoring configured

### 2. Deploy Using Script

```bash
# Run deployment script
./scripts/deploy.sh
```

The script will:
1. Create pre-deployment backup
2. Pull latest code and images
3. Build Docker images
4. Deploy with zero-downtime
5. Run health checks
6. Clean up old images

### 3. Manual Deployment

```bash
# Pull latest code
git pull origin main

# Pull Docker images
docker-compose -f docker-compose.prod.yml pull

# Start services
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 4. Verify Deployment

```bash
# Check health endpoints
curl https://yourdomain.com/health

# Check dashboard
curl https://yourdomain.com

# Check API
curl https://yourdomain.com/api/status

# View service status
docker-compose -f docker-compose.prod.yml ps
```

---

## CI/CD Setup

### GitHub Actions Configuration

#### 1. Set Repository Secrets

Go to GitHub → Settings → Secrets and variables → Actions:

```
Required Secrets:
- DEPLOY_HOST: Your server IP/hostname
- DEPLOY_USER: SSH username
- DEPLOY_SSH_KEY: Private SSH key
- DEPLOY_PATH: Path to AI Orchestra on server
- DATABASE_PASSWORD: Production database password
- REDIS_PASSWORD: Redis password
- GRAFANA_PASSWORD: Grafana password
- OPENAI_API_KEY: OpenAI API key

Optional Secrets:
- GROK_API_KEY: Grok API key
- GITHUB_TOKEN: Already provided by GitHub
- SLACK_WEBHOOK: Slack notifications
- DOCKERHUB_USERNAME: Docker Hub username
- DOCKERHUB_TOKEN: Docker Hub token
- AWS_ACCESS_KEY_ID: For S3 backups
- AWS_SECRET_ACCESS_KEY: For S3 backups
```

#### 2. SSH Key Setup

```bash
# On your local machine, generate SSH key
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github-actions

# Copy public key to server
ssh-copy-id -i ~/.ssh/github-actions.pub user@your-server

# Add private key to GitHub Secrets as DEPLOY_SSH_KEY
cat ~/.ssh/github-actions
```

#### 3. Workflow Configuration

The CI/CD pipeline includes:

- **test**: Run tests and linting
- **build-and-push**: Build and push Docker images
- **deploy**: Deploy to production server
- **security-scan**: Vulnerability scanning
- **backup**: Automated backups

Workflows trigger on:
- Push to `main` branch (deploy)
- Push to `develop` branch (test only)
- Pull requests
- Release tags

### Manual Deployment Trigger

```bash
# Trigger deployment via GitHub CLI
gh workflow run ci-cd.yml

# Or via API
curl -X POST \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/YOUR_ORG/AI-Orchestra/actions/workflows/ci-cd.yml/dispatches \
  -d '{"ref":"main"}'
```

---

## Monitoring & Alerts

### Access Monitoring Tools

- **Prometheus**: http://yourdomain.com:9090 (internal)
- **Grafana**: https://yourdomain.com/grafana
  - Username: admin
  - Password: (from GRAFANA_PASSWORD)

### Configure Dashboards

1. Log in to Grafana
2. Navigate to Dashboards
3. Import pre-configured dashboards:
   - System metrics
   - Application performance
   - LLM usage statistics
   - Error rates

### Set Up Alerts

Edit `monitoring/prometheus.yml` to add alert rules:

```yaml
groups:
  - name: ai-orchestra
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
```

### Log Management

```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f ai-orchestra

# View Nginx logs
docker-compose -f docker-compose.prod.yml logs -f nginx

# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# Log rotation is automatic via Docker
```

---

## Backup & Restore

### Automated Backups

Backups run automatically via cron (configured in CI/CD):

```bash
# View backup schedule
crontab -l

# Backups are stored in:
# - Local: ./volumes/backups/
# - S3: s3://YOUR_BUCKET/backups/ (if configured)
```

### Manual Backup

```bash
# Create backup
./scripts/backup.sh

# Backup location
ls -lh ./volumes/backups/

# Latest backup symlink
./volumes/backups/latest.tar.gz
```

### Restore from Backup

```bash
# List available backups
ls -lh ./volumes/backups/

# Restore from specific backup
./scripts/restore.sh ./volumes/backups/ai-orchestra-backup-20240101_120000.tar.gz

# Restore from latest
./scripts/restore.sh ./volumes/backups/latest.tar.gz
```

### Backup Strategy

**Recommended retention policy:**
- Daily backups: Keep 7 days
- Weekly backups: Keep 4 weeks
- Monthly backups: Keep 12 months

**What's backed up:**
- SQLite/PostgreSQL database
- Application logs
- Generated artifacts
- Configuration files

**What's NOT backed up:**
- Docker images (rebuild from source)
- node_modules (reinstall from package.json)
- Temporary files

---

## Maintenance

### Updating the Application

```bash
# Using deployment script (recommended)
./scripts/deploy.sh

# Manual update
git pull origin main
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --build
```

### Scaling Services

Edit `docker-compose.prod.yml`:

```yaml
services:
  ai-orchestra:
    deploy:
      replicas: 3  # Scale to 3 instances
      resources:
        limits:
          cpus: '4'
          memory: 8G
```

Then:

```bash
docker-compose -f docker-compose.prod.yml up -d --scale ai-orchestra=3
```

### Database Maintenance

```bash
# PostgreSQL vacuum
docker exec ai-orchestra-postgres vacuumdb -U postgres -d ai_orchestra

# SQLite optimization
docker exec ai-orchestra-app sqlite3 /app/database/memory.sqlite "VACUUM;"

# View database size
docker exec ai-orchestra-postgres psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('ai_orchestra'));"
```

### Cleaning Up

```bash
# Remove unused Docker resources
docker system prune -a --volumes

# Remove old logs (older than 30 days)
find ./volumes/logs -type f -mtime +30 -delete

# Remove old backups (older than 90 days)
find ./volumes/backups -name "*.tar.gz" -mtime +90 -delete
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs for specific service
docker-compose -f docker-compose.prod.yml logs --tail=100 ai-orchestra

# Check health
curl http://localhost:3000/health

# Restart service
docker-compose -f docker-compose.prod.yml restart ai-orchestra
```

### SSL Certificate Issues

```bash
# Test SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check certificate expiry
openssl x509 -in nginx/ssl/fullchain.pem -noout -dates

# Renew certificate manually
sudo certbot renew
```

### High Memory Usage

```bash
# Check memory usage
docker stats

# View container resource usage
docker-compose -f docker-compose.prod.yml ps -q | xargs docker stats --no-stream

# Restart specific service
docker-compose -f docker-compose.prod.yml restart ai-orchestra
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
docker exec ai-orchestra-postgres psql -U postgres -c "SELECT version();"

# View active connections
docker exec ai-orchestra-postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Restart database
docker-compose -f docker-compose.prod.yml restart postgres
```

### Nginx Issues

```bash
# Test Nginx configuration
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

# Reload Nginx (without restart)
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload

# View Nginx error log
docker-compose -f docker-compose.prod.yml logs nginx | grep error
```

### Performance Issues

```bash
# Check system resources
htop
df -h
free -m

# View Docker resource usage
docker stats

# Check application metrics
curl http://localhost:3000/metrics

# View slow queries (PostgreSQL)
docker exec ai-orchestra-postgres psql -U postgres -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

---

## Security Best Practices

### 1. Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Fail2ban for SSH protection
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

### 2. Regular Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose -f docker-compose.prod.yml pull

# Update application
git pull origin main
./scripts/deploy.sh
```

### 3. Secret Management

- Never commit `.env` files
- Use strong, unique passwords
- Rotate secrets regularly
- Use environment-specific credentials
- Consider using HashiCorp Vault or AWS Secrets Manager

### 4. Access Control

```bash
# Restrict SSH access
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no

# Use SSH keys only
# Implement 2FA for critical services
```

---

## Performance Optimization

### 1. Resource Limits

Set appropriate resource limits in `docker-compose.prod.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 4G
    reservations:
      cpus: '1'
      memory: 2G
```

### 2. Caching

- Nginx caching for static assets (configured)
- Redis for session management (optional)
- Application-level caching

### 3. Database Optimization

```bash
# Enable connection pooling
# Tune PostgreSQL configuration
# Regular VACUUM and ANALYZE
# Create appropriate indexes
```

### 4. CDN Integration

Consider using a CDN for:
- Static assets
- Dashboard files
- Large file downloads

---

## Support & Resources

- **Documentation**: /docs
- **GitHub Issues**: https://github.com/your-org/AI-Orchestra/issues
- **Community**: Discord/Slack channel
- **Professional Support**: support@yourdomain.com

---

## Appendix

### Environment Variables Reference

See `.env.production.example` for complete list.

### Port Reference

- 80: HTTP (redirects to HTTPS)
- 443: HTTPS (Nginx)
- 3000: Backend API (internal)
- 3001: Dashboard (internal)
- 3002: Grafana (internal)
- 5432: PostgreSQL (internal)
- 6379: Redis (internal)
- 9090: Prometheus (internal)
- 11434: Ollama (internal)

### File Locations

- Application: `/app`
- Database: `/app/database`
- Logs: `/app/logs`
- Artifacts: `/app/artifacts`
- Backups: `./volumes/backups`
- Nginx Config: `/etc/nginx`
- SSL Certificates: `/etc/nginx/ssl`

---

**Last Updated**: Phase 8 - Production Launch
**Version**: 0.8.0
