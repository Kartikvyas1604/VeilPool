# Contributing to VeilPool

Thank you for your interest in contributing to VeilPool! We welcome contributions from the community.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/VeilPool.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Run tests: `anchor test`
6. Commit your changes: `git commit -m "feat: add your feature"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Open a Pull Request

## Development Setup

### Prerequisites
- Rust 1.75+
- Solana CLI 1.18+
- Anchor 0.31.1
- Node.js 20+
- Docker & Docker Compose

### Installation
```bash
# Install dependencies
npm install

# Build Anchor programs
anchor build

# Run tests
anchor test

# Start routing engine
cd routing-engine && npm run dev
```

## Code Style

### Rust
- Follow standard Rust formatting: `cargo fmt`
- Run clippy: `cargo clippy`
- Add documentation comments for public APIs

### TypeScript
- Use ESLint: `npm run lint`
- Format with Prettier: `npm run format`
- Use TypeScript strict mode

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions or fixes
- `refactor:` Code refactoring
- `chore:` Build process or tooling changes

## Testing

- Write unit tests for Rust programs
- Add integration tests for SDK functions
- Include load tests for routing engine
- Aim for >80% code coverage

## Pull Request Process

1. Update documentation for any API changes
2. Add tests for new features
3. Ensure all tests pass
4. Update CHANGELOG.md
5. Request review from maintainers

## Security

Report security vulnerabilities to security@veilpool.io. Do not open public issues for security concerns.

## Questions?

Join our Discord or open a discussion on GitHub.
