# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Here are the versions that are currently being supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of Cardano MCP Server seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please do the following:

- **Do not** report security vulnerabilities through public GitHub issues
- Report security vulnerabilities by emailing [INSERT SECURITY EMAIL]
- Provide as much information as possible about the vulnerability
- If possible, include steps to reproduce the issue

### What to expect:

- We will acknowledge receipt of your vulnerability report within 48 hours
- We will send a more detailed response within 72 hours indicating the next steps
- We will keep you informed of the progress towards a fix and full announcement
- We may ask for additional information or guidance

### Security Update Process:

1. Security report received and is assigned a primary handler
2. Problem is confirmed and a list of affected versions is determined
3. Code is audited to find any similar problems
4. Fixes are prepared for all supported releases
5. Fixes are released and announced publicly

## Best Practices

When developing with the Cardano MCP Server, follow these security best practices:

1. **API Security**:

   - Always use HTTPS
   - Implement proper authentication
   - Use rate limiting
   - Validate all inputs

2. **Environment Variables**:

   - Never commit sensitive data
   - Use proper environment variable management
   - Rotate secrets regularly

3. **Dependencies**:

   - Keep dependencies up to date
   - Regularly run security audits
   - Use lockfiles to ensure dependency consistency

4. **Cardano-Specific**:
   - Always validate addresses before use
   - Use proper error handling for blockchain operations
   - Implement proper transaction signing procedures
   - Never expose private keys or seed phrases

## Security-Related Configuration

The server includes several security-related configuration options in the `.env` file:

```env
# Security Configuration
JWT_SECRET=your-secure-secret
API_KEY=your-api-key
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX_REQUESTS=100
```

Please ensure these are properly configured in your deployment.

## Responsible Disclosure

We kindly ask that you:

- Allow us a reasonable time to fix the issue before making it public
- Make a good faith effort to avoid privacy violations, destruction of data, and interruption or degradation of our service
- Do not access or modify other users' data without permission
- Do not exploit the vulnerability for more than is necessary to prove that it exists

## Bug Bounty Program

[If applicable, include information about your bug bounty program here]

## Contact

Security-related issues should be reported to:
[INSERT SECURITY CONTACT INFORMATION]
