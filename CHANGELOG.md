# Changelog

All notable changes to VeilPool will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2025-12-17

### Added - Production Enhancements 🚀
- **Node Registry**: Advanced heartbeat monitoring with latency and packet loss tracking
  - Dynamic reputation scoring based on performance metrics
  - Automatic uptime calculation with downtime penalties
  - Load-based node selection for fair distribution
  - Earnings tracking associated with bandwidth provided

- **Privacy Pool**: Daily bandwidth limits and usage analytics
  - Automatic daily usage reset after 24 hours
  - Session counter for monitoring and analytics
  - Enhanced anti-abuse with rate limiting per beneficiary
  - Real-time validation before redemption

- **Privacy Pass**: Dynamic demand-based pricing system
  - Demand factor range: 50%-200% (5000-20000 units)
  - Toggle for enabling/disabling dynamic pricing
  - Price update timestamp tracking
  - Tiered discount calculations preserved

- **Routing Engine**: Intelligent load balancing and caching
  - Node load tracking with automatic decay algorithm
  - Routing decision caching (5-minute TTL)
  - Load penalties to prevent node overutilization (2pts per active user)
  - Fixed Pyth API integration with proper method names

- **HTTP 402 Proxy**: Complete payment proxy implementation
  - Real-time bandwidth metering for all requests
  - Privacy pass validation against Solana program
  - Usage record buffering with 30-minute batch settlement
  - Automatic earnings aggregation by node operator
  - Settlement calculation at 0.0005 USDC per MB

- **Frontend**: Real blockchain data integration
  - Accurate account parsing matching Rust struct layouts
  - Proper offset calculation for all account fields
  - Lamports to SOL and bytes to GB conversions
  - Pass type detection (Pay-Per-GB, Subscription, Pool-Sponsored)

### Changed
- Updated all program IDs to deployed devnet addresses
- Improved error handling in routing engine
- Enhanced type safety in TypeScript services

### Fixed
- Pyth API method name corrections
- Account data size calculations for frontend parsing
- TypeScript type annotations in error handling

## [0.1.0] - 2025-12-17

### Added - Initial Release
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
