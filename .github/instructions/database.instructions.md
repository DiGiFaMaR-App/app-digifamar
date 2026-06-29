---
name: 'PostgreSQL Database Standards'
description: 'Database design and migration guidelines'
applyTo: 'database/**/*.{sql,md}'
---

## Database Guidelines

### Schema Design
- UUID primary keys (`uuid_generate_v4()`)
- Created/updated timestamps on all tables
- Soft deletes via `deletedAt` timestamp (don't hard delete)
- Enum types for fixed-value fields (status, roles)

### Naming Conventions
- Tables: plural, snake_case (`user_profiles`, `escrow_transactions`)
- Columns: snake_case (`created_at`, `buyer_id`)
- Foreign keys: `{table}_id` referencing `{table}.id`

### PostGIS
- SRID 4326 for all geospatial data
- Use `GEOGRAPHY` type for GPS coordinates (farm locations, delivery routes)
- Spatial indexes on location columns

### Migrations
- One migration per feature/PR
- Never edit existing migrations after merge
- Seed data for development environment only

### Performance
- Index foreign keys automatically
- Composite indexes for frequent query patterns
- Explain/analyze slow queries before optimizing
