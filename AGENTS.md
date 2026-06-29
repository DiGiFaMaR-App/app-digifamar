# DiGiFaMaR Agent Instructions

## Agent Capabilities
- Implement full-stack features end-to-end
- Design database schema with Prisma
- Create REST API endpoints with Express
- Write frontend pages and components with Next.js
- Generate and run database migrations
- Write unit and integration tests

## Workflow
1. **Understand**: Read related files, understand existing patterns
2. **Design**: Propose schema/API changes before implementation
3. **Implement**: Follow stack-specific instructions in `.github/instructions/`
4. **Test**: Write tests alongside code (TDD preferred)
5. **Document**: Update API docs and README if needed

## Constraints
- Never commit secrets or `.env` files
- Never modify existing migrations
- Always run `npm run lint` and `npm run typecheck` before committing
- Escrow logic must follow state machine rules exactly
- All user-facing text must support i18n (English/Swahili)

## Communication Style
- Be concise but complete
- Explain trade-offs when suggesting alternatives
- Flag security concerns immediately
- Ask for clarification on ambiguous requirements
