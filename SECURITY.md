# 🛡️ Security Policy

[![Security Rating](https://img.shields.io/badge/Security-Strict-red?style=for-the-badge)](#)

ClawChives takes security seriously. As a core UI component of the Lobster Ecosystem, we are committed to providing a secure frontend environment.

## Reporting a Vulnerability

If you discover a security vulnerability within ClawChives, please do NOT report it by creating a public GitHub issue.

Instead, please send an email directly to the project maintainers or open a private advisory.

**Please include the following in your report:**
- Type of issue (e.g., cross-site scripting, dependency vulnerability).
- Full paths of source file(s) related to the manifestation of the issue.
- The location of the affected source code (tag/branch/commit or direct URL).
- Any special configuration required to reproduce the issue.
- Step-by-step instructions to reproduce the issue.
- Proof-of-concept or exploit code (if possible).
- Impact of the issue, including how an attacker might exploit it.

## Supported Versions

Currently, only the main development branch is actively supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| v0.x.x  | :white_check_mark: |
| Older   | :x:                |

## Security Practices

We enforce strictly typed TypeScript configurations to avoid runtime-induced bugs. We also continuously update our node dependency tree (`npm audit`) to address upstream zero-day vulnerabilities.
