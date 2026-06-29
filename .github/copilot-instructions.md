# DiGiFaMaR - Agricultural Marketplace Infrastructure

## Project Overview
DiGiFaMaR is a direct-to-farm agricultural marketplace connecting farmers, buyers, logistics providers, and administrators. The platform facilitates transparent pricing, secure transactions via escrow, and efficient logistics coordination.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Database**: PostgreSQL 15+ with **PostGIS 3.4+ extension (REQUIRED)**
- **Auth**: JWT + refresh tokens, role-based access control (RBAC)
- **Payments**: Escrow system with state machine
- **Maps**: PostGIS SRID 4326 for geospatial queries, MapLibre/Leaflet for frontend maps

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

## Geospatial Requirements (CRITICAL)
- **All location data MUST use PostGIS `GEOGRAPHY(Point, 4326)`** — never plain lat/long columns
- **SRID 4326 (WGS 84)** is the standard for all GPS coordinates
- Farm boundaries: `GEOGRAPHY(Polygon, 4326)` for plot mapping
- Delivery routes: `GEOGRAPHY(LineString, 4326)` for logistics tracking
- Spatial indexes (`GIST`) on all geometry columns — required for performance
- Distance queries use `ST_DWithin` (meters) not `ST_Distance` for radius searches
- Location-based filtering: find farmers within X km of buyer, delivery zones, etc.
- Never store coordinates as separate `latitude`/`longitude` float columns
- GeoJSON is the interchange format for API requests/responses
