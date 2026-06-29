# DiGiFaMaR - Agricultural Marketplace Infrastructure

## Project Overview
DiGiFaMaR is a direct-to-farm agricultural marketplace connecting farmers, buyers, logistics providers, and administrators. The platform facilitates transparent pricing, secure transactions via escrow, and efficient logistics coordination.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Database**: PostgreSQL 15+ with PostGIS extension
- **Auth**: JWT + refresh tokens, role-based access control (RBAC)
- **Payments**: Escrow system with state machine
- **Maps**: PostGIS SRID 4326 for geospatial queries

## Architecture Principles
- Clean Architecture: Controllers → Services → Repositories
- API-first design with OpenAPI/Swagger documentation
- Database transactions for multi-table operations
- UUID primary keys for all entities
- Comprehensive test coverage (unit + integration)

## Security Standards
- Input validation with Zod schemas
- SQL injection prevention via parameterized queries/Prisma
- XSS protection via React escaping + CSP headers
- Rate limiting on auth endpoints
- Secret management via environment variables (never commit .env)
