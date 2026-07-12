# Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Configuration
- [ ] Copy `.env.example` to `.env.production`
- [ ] Update `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to production key
- [ ] Update `CLERK_SECRET_KEY` to production secret
- [ ] Update `DATABASE_URL` to production database (use pooled endpoint for Neon)
- [ ] Update `LIVEBLOCKS_SECRET_KEY` to production key
- [ ] Update `NEXT_PUBLIC_APP_URL` to production domain (https://your-domain.com)
- [ ] Set `NODE_ENV=production`

### 2. Database Setup

#### Neon PostgreSQL (Recommended for Serverless)
1. Create production database in [Neon](https://neon.tech)
2. Use **pooled connection string** (not direct)
   - Connection pooling path: `...pg.neon.tech/neondb?sslmode=require`
   - NOT: `...postgres.neon.tech/neondb`
3. Run migrations:
   ```bash
   DATABASE_URL="your_prod_db_url" npx prisma migrate deploy
   ```
4. Verify schema applied:
   ```bash
   DATABASE_URL="your_prod_db_url" npx prisma db execute --stdin < check.sql
   ```

#### AWS RDS / Self-Hosted
1. Enable SSL/TLS connections
2. Set up automated backups (daily minimum)
3. Enable Multi-AZ for high availability
4. Run migrations before deploying app

### 3. Security Hardening

#### Next.js Configuration
```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  }
];
```

#### CORS Configuration
- [ ] Set `ALLOWED_ORIGINS` to production domain only
- [ ] Disable CORS in development mode
- [ ] Verify webhook origins (Clerk, Liveblocks)

#### Secrets Management
- [ ] Never commit `.env.local` or credentials
- [ ] Use platform secret manager (Vercel Secrets, AWS Secrets Manager)
- [ ] Rotate API keys quarterly
- [ ] Use separate keys for dev/staging/prod

### 4. Performance Optimization

#### Database
- [ ] Connection pooling enabled (Neon pooled endpoint)
- [ ] Query indexes verified (prisma/schema.prisma)
  - `@@index([ownerId])`
  - `@@index([isDeleted])`
  - `@@index([isStarred])`
  - `@@index([fileId])` on comments/versions
- [ ] Pagination implemented (`take: 100`)
- [ ] N+1 query prevention via SELECT clauses

#### Application
- [ ] Static optimization via `next/image`
- [ ] API route compression (gzip enabled by default in Next.js)
- [ ] CDN setup for static assets
- [ ] Cache headers configured:
  ```javascript
  // API routes return Cache-Control: no-store
  // Static pages: Cache-Control: public, max-age=31536000, immutable
  ```

#### Monitoring Query Performance
```bash
# Check slow queries on Neon
SELECT query, mean_time, max_time, calls
FROM pg_stat_statements
WHERE query NOT ILIKE '%pg_stat%'
ORDER BY mean_time DESC
LIMIT 10;
```

### 5. Monitoring & Observability

#### Recommended Tools
- **Sentry** - Error tracking (JavaScript + Backend)
- **Datadog** - Infrastructure monitoring
- **Vercel Analytics** - Web vitals (if using Vercel)
- **LogRocket** - Session replay (optional)

#### Setup Sentry
```bash
npm install @sentry/nextjs
```

Create `sentry.client.config.js` and `sentry.edge.config.js`

#### Health Check Endpoint
Add `/api/health` for monitoring:
```typescript
export async function GET() {
  try {
    await prisma.designFile.findFirst(); // Test DB
    return Response.json({ status: "ok" });
  } catch (err) {
    return Response.json({ status: "error", error: err.message }, { status: 500 });
  }
}
```

### 6. Deployment Platforms

#### Vercel (Recommended - Native Next.js)
1. Connect GitHub repository
2. Set environment variables in Vercel dashboard
3. Enable automatic deployments on git push
4. Set up production domain
5. Configure preview deployments
6. Monitor analytics and errors in Vercel dashboard

#### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

#### Manual Deployment (VPS/EC2)
```bash
# SSH into production server
ssh user@prod-server

# Clone repo
git clone https://github.com/your/repo.git
cd repo

# Setup environment
cp .env.example .env.production
nano .env.production # Edit with prod values

# Install and build
npm ci
npm run build

# Run with process manager (PM2)
npm install -g pm2
pm2 start npm --name "figma-clone" -- start
pm2 save
pm2 startup
```

### 7. Backup & Disaster Recovery

#### Database Backups
- [ ] Daily automated backups enabled (Neon auto-backups free tier)
- [ ] Point-in-time recovery available (7+ days minimum)
- [ ] Test restore procedure monthly
- [ ] Store backups in separate region if possible

#### File Backups
- [ ] Canvas data versioned in VersionHistory table
- [ ] Automatic version snapshots on save
- [ ] Export designs regularly (Phase 3)

### 8. Post-Deployment Verification

```bash
# 1. Check health endpoint
curl https://your-domain.com/api/health

# 2. Test authentication
# - Sign up new user
# - Verify email confirmation
# - Check Clerk dashboard

# 3. Test core features
# - Create design
# - Export (PNG, SVG, PDF)
# - Share file
# - Create comment
# - Check real-time collaboration

# 4. Verify database
# - Check migrations applied
# - Verify indexes exist
# - Test query performance

# 5. Monitor logs
# - Check error tracking (Sentry)
# - Monitor database slow queries
# - Verify no auth errors
```

### 9. Ongoing Maintenance

#### Weekly
- [ ] Monitor error rates and uptime
- [ ] Check database performance metrics
- [ ] Review security logs

#### Monthly
- [ ] Rotate API keys
- [ ] Update dependencies (`npm audit`)
- [ ] Test backup restoration
- [ ] Review user feedback

#### Quarterly
- [ ] Security audit
- [ ] Load testing
- [ ] Disaster recovery drill

## Scaling Considerations

### Database Scaling
- **Current:** Neon Free (1GB storage, shared compute)
- **Scale up:** Neon Pro or AWS RDS Multi-AZ
- **Optimization:** Add read replicas for high traffic

### Application Scaling
- **Serverless (Vercel):** Auto-scales with traffic
- **VPS:** Horizontal scaling with load balancer
- **Caching:** Add Redis for session/cache layer

### Real-time Scaling (Liveblocks)
- Monitor concurrent users
- Set Liveblocks plan based on usage
- Consider alternative: self-hosted WebSocket server

## Security Checklist

- [ ] HTTPS enforced (SSL/TLS certificate)
- [ ] CSRF tokens on forms
- [ ] Rate limiting on API endpoints
- [ ] Input validation on all user input
- [ ] SQL injection prevention (Prisma ORM)
- [ ] XSS protection (React escaping)
- [ ] CORS properly configured
- [ ] Authentication session timeouts set
- [ ] API keys rotated regularly
- [ ] Secrets not in git history
- [ ] Database connection string uses SSL
- [ ] Backup encryption enabled

## Rollback Plan

If deployment fails:

1. **Immediate:** Stop traffic to broken version
2. **Within 5 min:** Revert to previous commit
3. **Database:** Restore from backup if corrupted
4. **Notify:** Alert stakeholders of issues
5. **Post-mortem:** Review what went wrong

## Support & Monitoring

- **Sentry Dashboard:** Error tracking and alerting
- **Vercel Dashboard:** Deployment logs and metrics
- **Neon Dashboard:** Database performance monitoring
- **Clerk Dashboard:** User authentication events
- **Liveblocks Dashboard:** Real-time activity

---

**Estimated deployment time:** 30-60 minutes first time, 5-10 minutes subsequent deploys

**Questions?** Check the troubleshooting section in this file or review phase-specific documentation.
