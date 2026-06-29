---
name: 'Frontend React/Next.js Standards'
description: 'Coding conventions for Next.js frontend'
applyTo: 'frontend/**/*.{ts,tsx}'
---

## Frontend Development Guidelines

### Component Structure
- Use functional components with hooks
- Colocate related components in feature folders
- Shared UI components go in `components/ui/` (shadcn/ui pattern)

### State Management
- React Query (TanStack Query) for server state
- Zustand for client-only global state
- React Context only for theme/auth injection

### Styling
- Tailwind CSS utility-first approach
- Use `cn()` utility for conditional classes
- Dark mode support via `next-themes`

### Forms
- React Hook Form for form handling
- Zod for schema validation
- Error messages mapped to fields

### API Integration
- Use generated API client from OpenAPI spec
- Handle loading/error states explicitly
- Optimistic updates where UX-critical

### Performance
- Dynamic imports for heavy components
- Image optimization with `next/image`
- Route-level code splitting
