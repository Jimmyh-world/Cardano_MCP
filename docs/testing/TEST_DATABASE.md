# Testing Database

This document describes the testing database setup, configuration, and usage for the Model Context Protocol (MCP) server project.

## Overview

The MCP project uses a dedicated testing database to ensure:

1. Tests run against a consistent data environment
2. Production data is never affected by tests
3. Test data can be reliably reset between test runs
4. Multiple test suites can run in parallel without conflicts

## Database Configuration

### Default Configuration

The testing database uses the following default configuration:

```
Host: localhost
Port: 5432
Database: cardano_mcp_test
Username: postgres
Password: postgres
```

These values can be overridden using environment variables:

```bash
POSTGRES_HOST=custom-host
POSTGRES_PORT=5433
POSTGRES_DB=custom_test_db
POSTGRES_USER=custom_user
POSTGRES_PASSWORD=custom_password
```

### Schema

The testing database uses the following schema:

```sql
-- Documentation sources
CREATE TABLE documentation_sources (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documentation sections
CREATE TABLE documentation_sections (
  id VARCHAR(255) PRIMARY KEY,
  source_id VARCHAR(255) REFERENCES documentation_sources(id),
  title VARCHAR(255),
  content TEXT NOT NULL,
  path VARCHAR(255),
  level INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documentation metadata
CREATE TABLE documentation_metadata (
  id SERIAL PRIMARY KEY,
  section_id VARCHAR(255) REFERENCES documentation_sections(id),
  key VARCHAR(255) NOT NULL,
  value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Repositories
CREATE TABLE repositories (
  id SERIAL PRIMARY KEY,
  owner VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  url VARCHAR(255),
  stars INTEGER DEFAULT 0,
  forks INTEGER DEFAULT 0,
  issues INTEGER DEFAULT 0,
  default_branch VARCHAR(255) DEFAULT 'main',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Repository content
CREATE TABLE repository_content (
  id SERIAL PRIMARY KEY,
  repository_id INTEGER REFERENCES repositories(id),
  path VARCHAR(255) NOT NULL,
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge graph
CREATE TABLE knowledge_graph (
  id SERIAL PRIMARY KEY,
  source_id VARCHAR(255) NOT NULL,
  target_id VARCHAR(255) NOT NULL,
  relationship_type VARCHAR(50) NOT NULL,
  weight FLOAT DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Setup and Initialization

### Local Development Setup

To set up the testing database for local development:

```bash
# Setup the test database
npm run setup:test-db
```

This script will:

1. Check if PostgreSQL is installed and running
2. Create the test database if it doesn't exist
3. Apply the schema and migrations
4. Create test data for development

### CI/CD Environment

In CI/CD environments, the database is automatically set up using the GitHub Actions workflow:

```yaml
services:
  postgres:
    image: postgres:14
    env:
      POSTGRES_DB: cardano_mcp_test
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

## Test Data Management

### Seed Data

The project includes seed data for testing purposes:

- Sample documentation sources
- Example documentation sections with metadata
- Repository data with content samples
- Knowledge graph relationships

This data is loaded using seed scripts:

```bash
# Load seed data
npm run db:seed
```

### Data Reset

Before each test run, the database is reset to a clean state:

```typescript
// Reset database before tests
beforeEach(async () => {
  await db.reset();
});
```

This ensures test isolation and prevents test interference.

## Using the Testing Database in Tests

### Connection Management

The testing database connection is managed through a dedicated test utility:

```typescript
import { createTestDatabase } from '../utils/test-db';

const db = createTestDatabase();

beforeAll(async () => {
  await db.connect();
});

afterAll(async () => {
  await db.disconnect();
});
```

### Query Interface

The testing database provides a typed query interface:

```typescript
// Example: Finding documentation by title
const docs = await db.query<DocumentationSection>(
  'SELECT * FROM documentation_sections WHERE title LIKE $1',
  [`%${searchTerm}%`],
);
```

### Transaction Support

For tests requiring transaction support:

```typescript
await db.transaction(async (client) => {
  // Perform operations within a transaction
  await client.query('INSERT INTO repositories (owner, name) VALUES ($1, $2)', [
    'test-owner',
    'test-repo',
  ]);
  await client.query('INSERT INTO repository_content (repository_id, path) VALUES ($1, $2)', [
    1,
    'README.md',
  ]);
});
```

## Mock Data Generation

The testing system includes utilities for generating mock data:

```typescript
import { generateMockDocumentation } from '../utils/mock-generators';

// Generate 10 mock documentation sections
const mockDocs = generateMockDocumentation(10);

// Insert mock data
await db.insertDocumentation(mockDocs);
```

## Performance Considerations

### Optimization for Test Performance

The testing database is optimized for test performance:

- Minimal indexing to reduce write overhead
- Simplified constraints for faster inserts
- In-memory mode for unit tests
- Persistent mode for integration tests

### Parallel Test Execution

For parallel test execution:

```typescript
// Create isolated test database instance
const testDb = createTestDatabase({
  database: `cardano_mcp_test_${process.env.JEST_WORKER_ID}`,
});
```

This creates isolated database instances for each test worker.

## Troubleshooting

### Common Issues

1. **Connection Failures**: Ensure PostgreSQL is running and accessible
2. **Permission Errors**: Verify the test user has appropriate permissions
3. **Schema Sync Issues**: Run `npm run db:migrate:test` to synchronize the schema

### Logs and Diagnostics

Enable detailed database logs with:

```typescript
const db = createTestDatabase({
  logQueries: true,
  logConnections: true,
});
```

## Migration Strategy

### Schema Updates

When updating the database schema:

1. Create a new migration file in `migrations/`
2. Apply the migration with `npm run db:migrate:test`
3. Update test utilities if necessary

### Version Control

Database schema changes are tracked in version control:

```
migrations/
├── 0001_initial_schema.sql
├── 0002_add_code_blocks_table.sql
└── 0003_add_repository_indexes.sql
```

## Best Practices

1. Always use parameterized queries to prevent SQL injection
2. Clean up resources after test completion
3. Use transactions for multi-step operations
4. Avoid dependencies between test suites
5. Keep test data minimal and focused

## Future Enhancements

Planned improvements to the testing database include:

- Support for multiple database types (PostgreSQL, SQLite, MySQL)
- Automated schema validation against production
- Enhanced mock data generation based on production patterns
- Performance profiling for database operations
- Snapshot-based testing for complex data structures

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js PostgreSQL Client](https://node-postgres.com/)
- [Jest Database Testing Guide](https://jestjs.io/docs/database-testing)
- [Project Database Design Document](/docs/architecture/database.md)
