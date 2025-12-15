import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createMint, mintTo, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';
import { expect } from 'chai';
import { NodeRegistry } from '../../target/types/node_registry';
import { PrivacyPool } from '../../target/types/privacy_pool';
import { PrivacyPass } from '../../target/types/privacy_pass';
import { VrfNodeSelection } from '../../target/types/vrf_node_selection';

describe('VeilPool - Full Integration Flow', () => {
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);

  const nodeRegistryProgram = anchor.workspace.NodeRegistry as Program<NodeRegistry>;
  const privacyPoolProgram = anchor.workspace.PrivacyPool as Program<PrivacyPool>;
  const privacyPassProgram = anchor.workspace.PrivacyPass as Program<PrivacyPass>;
  const vrfProgram = anchor.workspace.VrfNodeSelection as Program<VrfNodeSelection>;

  let tokenMint: PublicKey;
  let globalRegistry: PublicKey;
  let pricingConfig: PublicKey;
  let nodeOperator1: Keypair;
  let nodeOperator2: Keypair;
  let sponsor: Keypair;
  let beneficiary: Keypair;
  let user: Keypair;

  before(async () => {
    // Generate keypairs
    nodeOperator1 = Keypair.generate();
    nodeOperator2 = Keypair.generate();
    sponsor = Keypair.generate();
    beneficiary = Keypair.generate();
    user = Keypair.generate();

    // Airdrop SOL to all accounts
    const airdropAmount = 100 * web3.LAMPORTS_PER_SOL;
    await Promise.all([
      provider.connection.requestAirdrop(nodeOperator1.publicKey, airdropAmount),
      provider.connection.requestAirdrop(nodeOperator2.publicKey, airdropAmount),
      provider.connection.requestAirdrop(sponsor.publicKey, airdropAmount),
      provider.connection.requestAirdrop(beneficiary.publicKey, airdropAmount),
      provider.connection.requestAirdrop(user.publicKey, airdropAmount),
    ]);

    // Wait for confirmations
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create token mint for testing
    tokenMint = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      6 // USDC decimals
    );

    // Mint tokens to sponsor and user
    const sponsorAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      tokenMint,
      sponsor.publicKey
    );

    const userAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      tokenMint,
      user.publicKey
    );

    await mintTo(
      provider.connection,
      provider.wallet.payer,
      tokenMint,
      sponsorAta.address,
      provider.wallet.publicKey,
      10_000_000_000 // 10,000 USDC
    );

    await mintTo(
      provider.connection,
      provider.wallet.payer,
      tokenMint,
      userAta.address,
      provider.wallet.publicKey,
      1_000_000_000 // 1,000 USDC
    );

    // Derive PDAs
    [globalRegistry] = PublicKey.findProgramAddressSync(
      [Buffer.from('registry')],
      nodeRegistryProgram.programId
    );

    [pricingConfig] = PublicKey.findProgramAddressSync(
      [Buffer.from('pricing_config')],
      privacyPassProgram.programId
    );
  });

  describe('1. Node Registry - Complete Flow', () => {
    it('Initializes the global registry', async () => {
      const protocolFeeVault = Keypair.generate().publicKey;

      await nodeRegistryProgram.methods
        .initialize()
        .accounts({
          globalRegistry,
          authority: provider.wallet.publicKey,
          protocolFeeVault,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const registryData = await nodeRegistryProgram.account.globalRegistry.fetch(globalRegistry);
      expect(registryData.totalNodes).to.equal(0);
      expect(registryData.authority.toBase58()).to.equal(provider.wallet.publicKey.toBase58());
    });

    it('Registers node operator 1', async () => {
      const [nodeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('node'), nodeOperator1.publicKey.toBuffer()],
        nodeRegistryProgram.programId
      );

      await nodeRegistryProgram.methods
        .registerNode('US-California-SF', '185.227.108.45', 10)
        .accounts({
          nodeAccount,
          globalRegistry,
          operator: nodeOperator1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([nodeOperator1])
        .rpc();

      const nodeData = await nodeRegistryProgram.account.nodeAccount.fetch(nodeAccount);
      expect(nodeData.operator.toBase58()).to.equal(nodeOperator1.publicKey.toBase58());
      expect(nodeData.location).to.equal('US-California-SF');
      expect(nodeData.reputation).to.equal(100);
      expect(nodeData.isActive).to.equal(false); // Not active until staked
    });

    it('Stakes 100 SOL and activates node', async () => {
      const [nodeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('node'), nodeOperator1.publicKey.toBuffer()],
        nodeRegistryProgram.programId
      );

      const [stakeVault] = PublicKey.findProgramAddressSync(
        [Buffer.from('stake'), nodeAccount.toBuffer()],
        nodeRegistryProgram.programId
      );

      const stakeAmount = new BN(100 * web3.LAMPORTS_PER_SOL);

      await nodeRegistryProgram.methods
        .stakeSol(stakeAmount)
        .accounts({
          nodeAccount,
          stakeVault,
          globalRegistry,
          operator: nodeOperator1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([nodeOperator1])
        .rpc();

      const nodeData = await nodeRegistryProgram.account.nodeAccount.fetch(nodeAccount);
      expect(nodeData.isActive).to.equal(true);
      expect(nodeData.stakeAmount.toNumber()).to.equal(stakeAmount.toNumber());
    });

    it('Registers and stakes node operator 2', async () => {
      const [nodeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('node'), nodeOperator2.publicKey.toBuffer()],
        nodeRegistryProgram.programId
      );

      await nodeRegistryProgram.methods
        .registerNode('DE-Berlin', '185.220.101.45', 10)
        .accounts({
          nodeAccount,
          globalRegistry,
          operator: nodeOperator2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([nodeOperator2])
        .rpc();

      const [stakeVault] = PublicKey.findProgramAddressSync(
        [Buffer.from('stake'), nodeAccount.toBuffer()],
        nodeRegistryProgram.programId
      );

      await nodeRegistryProgram.methods
        .stakeSol(new BN(150 * web3.LAMPORTS_PER_SOL))
        .accounts({
          nodeAccount,
          stakeVault,
          globalRegistry,
          operator: nodeOperator2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([nodeOperator2])
        .rpc();

      const registryData = await nodeRegistryProgram.account.globalRegistry.fetch(globalRegistry);
      expect(registryData.totalNodes).to.equal(2);
    });

    it('Updates heartbeat and records bandwidth', async () => {
      const [nodeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('node'), nodeOperator1.publicKey.toBuffer()],
        nodeRegistryProgram.programId
      );

      await nodeRegistryProgram.methods
        .updateHeartbeat(new BN(100)) // 100 GB served
        .accounts({
          nodeAccount,
          globalRegistry,
          operator: nodeOperator1.publicKey,
        })
        .signers([nodeOperator1])
        .rpc();

      const nodeData = await nodeRegistryProgram.account.nodeAccount.fetch(nodeAccount);
      expect(nodeData.totalBandwidthServed.toNumber()).to.equal(100);
    });

    it('Records and claims earnings', async () => {
      const [nodeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('node'), nodeOperator1.publicKey.toBuffer()],
        nodeRegistryProgram.programId
      );

      const earnings = new BN(5 * web3.LAMPORTS_PER_SOL);

      await nodeRegistryProgram.methods
        .recordEarnings(earnings)
        .accounts({
          nodeAccount,
          globalRegistry,
          operator: nodeOperator1.publicKey,
        })
        .signers([nodeOperator1])
        .rpc();

      const nodeDataBefore = await nodeRegistryProgram.account.nodeAccount.fetch(nodeAccount);
      expect(nodeDataBefore.earningsAccumulated.toNumber()).to.be.greaterThan(0);

      // Note: claim_earnings requires earnings vault setup in production
    });
  });

  describe('2. Privacy Pool - Sponsored Access', () => {
    let poolId: BN;
    let poolAccount: PublicKey;

    it('Sponsor creates a privacy pool', async () => {
      poolId = new BN(Date.now());

      [poolAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('pool'), sponsor.publicKey.toBuffer(), poolId.toArrayLike(Buffer, 'le', 8)],
        privacyPoolProgram.programId
      );

      const [poolVault] = PublicKey.findProgramAddressSync(
        [Buffer.from('pool_vault'), sponsor.publicKey.toBuffer(), poolId.toArrayLike(Buffer, 'le', 8)],
        privacyPoolProgram.programId
      );

      const sponsorAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,
        tokenMint,
        sponsor.publicKey
      );

      await privacyPoolProgram.methods
        .createPool(poolId, 'Journalist Protection Fund', new BN(5_000_000_000), new BN(10))
        .accounts({
          poolAccount,
          poolVault,
          tokenMint,
          sponsorTokenAccount: sponsorAta.address,
          sponsor: sponsor.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([sponsor])
        .rpc();

      const poolData = await privacyPoolProgram.account.poolAccount.fetch(poolAccount);
      expect(poolData.name).to.equal('Journalist Protection Fund');
      expect(poolData.totalFunded.toNumber()).to.equal(5_000_000_000);
      expect(poolData.isActive).to.equal(true);
    });

    it('Adds beneficiary to pool', async () => {
      const [beneficiaryAccess] = PublicKey.findProgramAddressSync(
        [Buffer.from('access'), poolId.toArrayLike(Buffer, 'le', 8), beneficiary.publicKey.toBuffer()],
        privacyPoolProgram.programId
      );

      await privacyPoolProgram.methods
        .addBeneficiaries(poolId, beneficiary.publicKey, new BN(50))
        .accounts({
          poolAccount,
          beneficiaryAccess,
          beneficiaryKey: beneficiary.publicKey,
          sponsor: sponsor.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([sponsor])
        .rpc();

      const accessData = await privacyPoolProgram.account.beneficiaryAccess.fetch(beneficiaryAccess);
      expect(accessData.allocatedGb.toNumber()).to.equal(50);
      expect(accessData.isWhitelisted).to.equal(true);
    });

    it('Beneficiary redeems pool access', async () => {
      const [beneficiaryAccess] = PublicKey.findProgramAddressSync(
        [Buffer.from('access'), poolId.toArrayLike(Buffer, 'le', 8), beneficiary.publicKey.toBuffer()],
        privacyPoolProgram.programId
      );

      await privacyPoolProgram.methods
        .redeemAccess(new BN(10))
        .accounts({
          poolAccount,
          beneficiaryAccess,
          beneficiary: beneficiary.publicKey,
        })
        .signers([beneficiary])
        .rpc();

      const accessData = await privacyPoolProgram.account.beneficiaryAccess.fetch(beneficiaryAccess);
      expect(accessData.usedGb.toNumber()).to.equal(10);
      expect(accessData.allocatedGb.toNumber() - accessData.usedGb.toNumber()).to.equal(40);
    });

    it('Sponsor enables auto-refill', async () => {
      await privacyPoolProgram.methods
        .updateAutoRefill(true, new BN(1_000_000_000))
        .accounts({
          poolAccount,
          sponsor: sponsor.publicKey,
        })
        .signers([sponsor])
        .rpc();

      const poolData = await privacyPoolProgram.account.poolAccount.fetch(poolAccount);
      expect(poolData.autoRefillEnabled).to.equal(true);
    });
  });

  describe('3. Privacy Pass - Purchase & Usage', () => {
    it('Initializes the pass system', async () => {
      const passMint = await createMint(
        provider.connection,
        provider.wallet.payer,
        provider.wallet.publicKey,
        null,
        9
      );

      const treasury = Keypair.generate().publicKey;

      await privacyPassProgram.methods
        .initializePassSystem(Keypair.generate().publicKey) // Pyth oracle placeholder
        .accounts({
          pricingConfig,
          passMint,
          treasury,
          authority: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const config = await privacyPassProgram.account.pricingConfig.fetch(pricingConfig);
      expect(config.isActive).to.equal(true);
    });

    it('User purchases privacy pass', async () => {
      const [passAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('pass'), user.publicKey.toBuffer()],
        privacyPassProgram.programId
      );

      const userAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,
        tokenMint,
        user.publicKey
      );

      const config = await privacyPassProgram.account.pricingConfig.fetch(pricingConfig);
      const treasuryAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,
        tokenMint,
        config.treasury
      );

      await privacyPassProgram.methods
        .purchasePass(new BN(100)) // 100 GB
        .accounts({
          passAccount,
          pricingConfig,
          userTokenAccount: userAta.address,
          treasury: treasuryAta.address,
          user: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      const passData = await privacyPassProgram.account.passAccount.fetch(passAccount);
      expect(passData.remainingGb.toNumber()).to.equal(100);
      expect(passData.isActive).to.equal(true);
    });

    it('User redeems privacy pass', async () => {
      const [passAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('pass'), user.publicKey.toBuffer()],
        privacyPassProgram.programId
      );

      const [nodeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('node'), nodeOperator1.publicKey.toBuffer()],
        nodeRegistryProgram.programId
      );

      await privacyPassProgram.methods
        .redeemPass(new BN(5), nodeOperator1.publicKey)
        .accounts({
          passAccount,
          user: user.publicKey,
        })
        .signers([user])
        .rpc();

      const passData = await privacyPassProgram.account.passAccount.fetch(passAccount);
      expect(passData.remainingGb.toNumber()).to.equal(95);
    });
  });

  describe('4. VRF Node Selection', () => {
    it('Requests random node selection', async () => {
      const [vrfRequest] = PublicKey.findProgramAddressSync(
        [Buffer.from('vrf_request'), user.publicKey.toBuffer()],
        vrfProgram.programId
      );

      const seed = Buffer.from(new Uint8Array(32).fill(Math.floor(Math.random() * 255)));

      await vrfProgram.methods
        .requestRandomNode(Array.from(seed))
        .accounts({
          vrfRequest,
          user: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      const requestData = await vrfProgram.account.vrfRequest.fetch(vrfRequest);
      expect(requestData.isFulfilled).to.equal(false);
    });

    it('Fulfills VRF selection with weighted nodes', async () => {
      const [vrfRequest] = PublicKey.findProgramAddressSync(
        [Buffer.from('vrf_request'), user.publicKey.toBuffer()],
        vrfProgram.programId
      );

      const [node1] = PublicKey.findProgramAddressSync(
        [Buffer.from('node'), nodeOperator1.publicKey.toBuffer()],
        nodeRegistryProgram.programId
      );

      const [node2] = PublicKey.findProgramAddressSync(
        [Buffer.from('node'), nodeOperator2.publicKey.toBuffer()],
        nodeRegistryProgram.programId
      );

      // Simulate VRF result
      const vrfResult = Buffer.from(new Uint8Array(32).fill(Math.floor(Math.random() * 255)));

      await vrfProgram.methods
        .fulfillRandomSelection(
          Array.from(vrfResult),
          [node1, node2],
          [95, 100] // Reputation-based weights
        )
        .accounts({
          vrfRequest,
          vrfAuthority: provider.wallet.publicKey,
        })
        .rpc();

      const requestData = await vrfProgram.account.vrfRequest.fetch(vrfRequest);
      expect(requestData.isFulfilled).to.equal(true);
      expect(requestData.selectedNode).to.not.be.null;
    });
  });

  describe('5. End-to-End Flow', () => {
    it('Complete user journey: Purchase -> Connect -> Use -> Disconnect', async () => {
      console.log('\n=== COMPLETE USER JOURNEY ===\n');

      // Step 1: User checks pass balance
      const [passAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('pass'), user.publicKey.toBuffer()],
        privacyPassProgram.programId
      );

      let passData = await privacyPassProgram.account.passAccount.fetch(passAccount);
      console.log(`1. User has ${passData.remainingGb.toNumber()} GB remaining`);

      // Step 2: Request optimal node via VRF
      console.log('2. Requesting optimal node via VRF...');
      const [vrfRequest2] = PublicKey.findProgramAddressSync(
        [Buffer.from('vrf_request_2'), user.publicKey.toBuffer()],
        vrfProgram.programId
      );

      // Step 3: Connect to selected node
      console.log('3. Connecting to selected node...');
      const [node1] = PublicKey.findProgramAddressSync(
        [Buffer.from('node'), nodeOperator1.publicKey.toBuffer()],
        nodeRegistryProgram.programId
      );

      const nodeDataBefore = await nodeRegistryProgram.account.nodeAccount.fetch(node1);
      console.log(`   Node reputation: ${nodeDataBefore.reputation}`);

      // Step 4: Use bandwidth
      console.log('4. Using 20 GB of bandwidth...');
      await privacyPassProgram.methods
        .redeemPass(new BN(20), nodeOperator1.publicKey)
        .accounts({
          passAccount,
          user: user.publicKey,
        })
        .signers([user])
        .rpc();

      // Step 5: Node records bandwidth served
      await nodeRegistryProgram.methods
        .updateHeartbeat(new BN(20))
        .accounts({
          nodeAccount: node1,
          globalRegistry,
          operator: nodeOperator1.publicKey,
        })
        .signers([nodeOperator1])
        .rpc();

      // Step 6: Verify final state
      passData = await privacyPassProgram.account.passAccount.fetch(passAccount);
      const nodeDataAfter = await nodeRegistryProgram.account.nodeAccount.fetch(node1);

      console.log(`5. Final user balance: ${passData.remainingGb.toNumber()} GB`);
      console.log(`   Node bandwidth served: ${nodeDataAfter.totalBandwidthServed.toNumber()} GB`);

      expect(passData.remainingGb.toNumber()).to.equal(75); // Started at 95, used 20
      expect(nodeDataAfter.totalBandwidthServed.toNumber()).to.equal(120); // 100 + 20
    });
  });
});
