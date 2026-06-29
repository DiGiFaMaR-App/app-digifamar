---
name: 'PostgreSQL Database Standards'
description: 'Database design and migration guidelines'
applyTo: 'database/**/*.{sql,md}'
---

## Database Guidelines

### Schema Design
- UUID primary keys (`uuid_generate_v4()`)
- Created/updated timestamps on all tables
- Soft deletes via `deleted_at` timestamp (don't hard delete)
- Enum types for fixed-value fields (status, roles)

### Naming Conventions
- Tables: plural, snake_case (`user_profiles`, `escrow_transactions`)
- Columns: snake_case (`created_at`, `buyer_id`)
- Foreign keys: `{table}_id` referencing `{table}.id`

## PostGIS — MANDATORY RULES

### Extension Setup
Run this before any geo migrations:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
```

### Coordinate Standard
- SRID 4326 (WGS 84) for ALL geospatial data — no exceptions
- GPS coordinates from mobile devices, farm mapping, delivery tracking all use 4326

### Column Types
| Use Case | PostGIS Type | Example column definition |
|---|---|---|
| Single point (farm center, pickup location) | GEOGRAPHY(Point, 4326) | location GEOGRAPHY(Point, 4326)
| Farm plot boundary | GEOGRAPHY(Polygon, 4326) | boundary GEOGRAPHY(Polygon, 4326)
| Delivery route path | GEOGRAPHY(LineString, 4326) | route_path GEOGRAPHY(LineString, 4326)
| Delivery coverage area | GEOGRAPHY(Polygon, 4326) | coverage_zone GEOGRAPHY(Polygon, 4326)

### Spatial Indexes (REQUIRED)
```sql
CREATE INDEX idx_farms_location ON farms USING GIST (location);
CREATE INDEX idx_delivery_routes_path ON delivery_routes USING GIST (route_path);
CREATE INDEX idx_orders_delivery_location ON orders USING GIST (delivery_location);
```

### Query Patterns
Radius search (find farmers within 10km):

```sql
SELECT * FROM farms 
WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 10000);
```

Distance calculation (km between two points):

```sql
SELECT ST_Distance(f1.location, f2.location) / 1000 AS distance_km 
FROM farms f1, farms f2 WHERE f1.id = $1 AND f2.id = $2;
```

Point-in-polygon (is location inside delivery zone?):

```sql
SELECT ST_Covers(coverage_zone, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) 
FROM logistics_providers WHERE id = $1;
```

### Prisma Integration
Prisma does not have native geography types; use Unsupported and raw SQL where needed:

```prisma
model Farm {
  id       String   @id @default(uuid())
  name     String
  location Unsupported("geography(Point, 4326)")

  @@index([location], type: Gist)
}
```

### Migrations
- One migration per feature/PR
- Never edit existing migrations after merge
- Seed data for development environment only
- PostGIS extension must be enabled before any geo migrations run

### Performance
- Index foreign keys automatically
- Composite indexes for frequent query patterns
- Explain/analyze slow queries before optimizing
- Always use GIST indexes on geometry columns — B-tree indexes do not work for spatial queries
