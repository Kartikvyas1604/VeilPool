# VeilPool Test Suite

Comprehensive testing for all VeilPool components.

## Test Coverage

### Solana Programs (80+ tests)
- **Privacy Pool**: Pool creation, beneficiary management, fund distribution, pool closure
- **Privacy Pass**: Pass minting, validation, bandwidth tracking, expiration
- **Node Registry**: Registration, heartbeat monitoring, reputation, earnings
- **VRF Selection**: Random node selection, proof verification

### Routing Engine (40+ tests)
- **API Endpoints**: Health check, node selection, threat intelligence
- **Pyth Integration**: Price feeds for SOL/USDC/USDT
- **OONI Integration**: Real-time censorship data from 27 countries
- **Error Handling**: Rate limiting, validation, fallbacks

### SDK (30+ tests)
- **Privacy Routing**: enablePrivacy(), pass validation, VRF node selection
- **Connection Management**: Connect, disconnect, auto-reconnect
- **Traffic Routing**: Proxy configuration, bandwidth tracking
- **Error Handling**: Network failures, invalid inputs

## Running Tests

```bash
# Install dependencies
cd tests
npm install

# Run all tests
npm test

# Run specific test suite
npm run test:programs      # Solana program tests
npm run test:routing       # Routing engine API tests
npm run test:sdk          # SDK tests

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Prerequisites

### Local Test Environment

1. **Solana Test Validator**
```bash
solana-test-validator
```

2. **Routing Engine**
```bash
cd routing-engine
npm run dev
```

3. **Programs Deployed**
```bash
anchor build
anchor deploy --provider.cluster localnet
```

## Test Structure

```
tests/
├── programs.test.ts        # Solana program tests
├── routing-engine.test.ts  # API and integration tests
├── sdk.test.ts            # SDK functionality tests
├── integration/           # End-to-end integration tests
└── package.json          # Test dependencies and scripts
```

## Coverage Goals

- **Programs**: 80%+ coverage on all instructions
- **Routing Engine**: 75%+ coverage on API routes
- **SDK**: 70%+ coverage on public methods
- **Integration**: Critical user flows covered

## Continuous Integration

Tests run automatically on:
- Pull requests to main branch
- Commits to development branch
- Pre-deployment validation

## Writing Tests

### Example: Program Test

```typescript
describe('Privacy Pool', () => {
  it('should create pool with initial funding', async () => {
    const sponsor = Keypair.generate();
    const poolId = 'test-pool';
    const funding = 10 * LAMPORTS_PER_SOL;
    
    // Create pool instruction
    // Assert success
    expect(pool).toBeDefined();
  });
});
```

### Example: API Test

```typescript
describe('Routing API', () => {
  it('should return optimal node', async () => {
    const response = await axios.get('/api/routing/optimal-node', {
      params: { user_location: 'US' }
    });
    
    expect(response.status).toBe(200);
    expect(response.data.primaryNode).toBeDefined();
  });
});
```

### Example: SDK Test

```typescript
describe('VeilPool SDK', () => {
  it('should enable privacy routing', async () => {
    const sdk = new VeilPool({ rpcUrl, network: 'devnet' });
    const result = await sdk.enablePrivacy({ userId });
    
    expect(result.connected).toBe(true);
  });
});
```

## Mock Data

Tests use mock data where necessary:
- Mock wallet addresses
- Demo privacy passes
- Simulated network conditions
- Test node configurations

## Performance Testing

```bash
# Load testing routing engine
npm run test:load

# Benchmark SDK operations
npm run test:benchmark
```

## Security Testing

- Input validation tests
- Authorization checks
- Rate limiting verification
- Cryptographic function tests

## Test Results

View test results:
```bash
# Console output
npm test

# HTML coverage report
npm run test:coverage
open coverage/lcov-report/index.html
```

## Troubleshooting

**Tests failing locally?**
1. Ensure Solana test validator is running
2. Deploy programs to localnet
3. Start routing engine on port 3001
4. Check environment variables

**Flaky tests?**
- Increase timeouts for blockchain operations
- Add retry logic for network requests
- Mock external dependencies

## Contributing

When adding new features:
1. Write tests first (TDD)
2. Ensure coverage meets thresholds
3. Test both success and error cases
4. Update test documentation

## License

MIT
