# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.4.x   | :white_check_mark: |
| < 0.4.0 | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please create a private security advisory on GitHub or email security@testbase.ai instead of using the public issue tracker.

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and aim to release a patch within 7 days for critical vulnerabilities.

## Security Best Practices

When using computer-agents:

1. **API Keys**: Never commit API keys to version control
   - Use environment variables (`OPENAI_API_KEY`, `TESTBASE_API_KEY`)
   - Use `.env` files (already in `.gitignore`)

2. **Workspace Security**: Computer agents can execute code
   - Review agent instructions carefully
   - Use appropriate `skipGitRepoCheck` and `sandboxMode` settings

3. **Cloud Execution**: When using CloudRuntime
   - Protect your API keys
   - Set spending limits
   - Review usage regularly

4. **Dependencies**: Keep dependencies updated
   ```bash
   npm audit
   npm update
   ```

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find similar problems
3. Prepare fixes for all supported versions
4. Release new versions as soon as possible
5. Credit the reporter (unless they prefer to remain anonymous)

Thank you for helping keep computer-agents and our users safe!
