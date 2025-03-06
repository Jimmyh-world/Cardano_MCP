# Technical Debt Registry

## Active Items

### 1. Type Safety in Implementation.ts

- **Priority:** P2
- **Created:** 2024-03-21
- **Location:** `src/llm-prompts/implementation.ts`
- **Description:** Usage of `any` type in `calculateComplexity` method
- **Rationale:** Current implementation is functional but lacks type safety
- **Acceptance Criteria:**
  - Proper interface defined for request parameter
  - Type-safe implementation without `any`
  - No regression in functionality
- **Notes:** Consider batching with other type safety improvements

### 2. Unused Imports Cleanup

- **Priority:** P2
- **Created:** 2024-03-21
- **Location:** Multiple files including:
  - `src/llm-prompts/implementation.ts`
  - `src/knowledge/connector.ts`
- **Description:** Various unused imports flagged by linter
- **Rationale:** Not affecting functionality, can be addressed in batch
- **Acceptance Criteria:**
  - All unused imports removed
  - No new unused imports introduced
  - Clean linter report
- **Notes:** Consider implementing automated import cleanup in CI/CD

## Resolved Items

_(Template for resolved items)_

### Example Resolved Item

- **Priority:** P[0-2]
- **Created:** [Date]
- **Resolved:** [Date]
- **Location:** [File path]
- **Description:** [Issue description]
- **Resolution:** [How it was fixed]
- **Notes:** [Any follow-up considerations]

## Review History

### 2024-03-21

- Initial registry creation
- Documented existing type safety and unused import issues
- Set up tracking structure for future items
