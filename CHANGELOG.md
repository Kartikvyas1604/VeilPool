# Changelog

All notable changes to VeilPool will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial production release of VeilPool DePIN infrastructure
- Four Solana Anchor programs:
  - `node-registry`: Node operator management with staking
  - `privacy-pass`: Tiered bandwidth passes (Pay-per-GB, Subscriptions)
  - `privacy-pool`: Sponsored privacy pools for organizations
  - `vrf-selection`: VRF-based node selection for fairness
- Routing engine with AI-powered threat routing
- TypeScript SDK for users, operators, and sponsors
- End-to-end encryption (AES-256-GCM + RSA-2048)
- Prometheus metrics and monitoring
- Comprehensive test suite with 95%+ coverage
- CI/CD pipeline with GitHub Actions
- Docker deployment configuration
- Complete documentation suite

### Security
- Multi-signature authorization for critical operations
- Stake-based reputation system for node operators
- Automatic slashing for malicious behavior
- Rate limiting and DDoS protection
- Zero-knowledge proof support (future)

## [0.1.0] - 2025-12-05

### Added
- Initial alpha release
- Core Solana programs
- Basic routing engine
- SDK v1.0.0

[Unreleased]: https://github.com/Kartikvyas1604/VeilPool/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Kartikvyas1604/VeilPool/releases/tag/v0.1.0
