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
- HTTP status codes: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 409 (Conflict), 500 (Server Error)

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

### Error Handling
- Custom AppError class with status codes
- Global error middleware
- Never leak stack traces in production

### Validation
- Zod schemas for all request bodies/params
- Validate at route entry, not in controllers

### Testing
- Jest + Supertest for integration tests
- Mock external services (payment gateways, SMS)
- Minimum 80% coverage for services
