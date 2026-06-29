---
name: 'Backend Node.js API Standards'
description: 'Coding conventions for Express backend'
applyTo: 'backend/**/*.{js,ts}'
---

## Backend Development Guidelines

### API Design
- RESTful resource naming (`/api/v1/users`, `/api/v1/products`)
- One controller per resource
- Consistent response envelope: `{ success, data, error, meta }`
- HTTP status codes: 200, 201, 400, 401, 403, 404, 409, 500

### Database Operations
- Use Prisma transactions for multi-table operations
- Repository pattern for data access
- Never write raw SQL except for PostGIS geospatial queries

### Escrow State Machine
PENDING → FUNDED → DELIVERED → RELEASED
↓         ↓          ↓
DISPUTED  DISPUTED   DISPUTED

- State transitions only via dedicated service methods
- Audit log every transition with actor + timestamp

## Geospatial API Rules

### Request/Response Format
- Accept and return coordinates as **GeoJSON**:

```json
{
  "type": "Point",
  "coordinates": [longitude, latitude]
}
```

Order: [lng, lat] (GeoJSON standard) — validate this explicitly

### Validation (TypeScript + Zod)

```ts
import { z } from "zod";

const geoPointSchema = z.object({
  type: z.literal("Point"),
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
});
```

### Service Patterns
- findNearbyFarms(lng: number, lat: number, radiusKm: number) — uses ST_DWithin
- calculateDeliveryDistance(from: GeoPoint, to: GeoPoint) — uses ST_Distance
- isInsideDeliveryZone(point: GeoPoint, providerId: string) — uses ST_Covers
- Cache spatial query results with location hash keys (Redis)

### Error Handling
- Custom AppError class with status codes
- Global error middleware
- Never leak stack traces in production
- Return 400 for invalid coordinates, 422 for locations outside service area

### Validation
- Zod schemas for all request bodies/params
- Validate at route entry, not in controllers
- Clamp coordinates to valid ranges before DB queries

### Testing
- Jest + Supertest for integration tests
- Mock external services (payment gateways, SMS)
- Minimum 80% coverage for services
- Test spatial queries with known points (Nairobi, Mombasa, Kisumu)
