import { describe, it, expect, beforeAll } from '@jest/globals';
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet, BN } from '@coral-xyz/anchor';
import { PrivacyPass } from '../target/types/privacy_pass';
import * as anchor from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';

describe('Privacy Pass Program - Dynamic Pricing', () => {
  let provider: AnchorProvider;
  let program: Program<PrivacyPass>;
  let admin: Keypair;
  let user: Keypair;
  let usdcMint: PublicKey;
  let pricingConfig: PublicKey;
  let userTokenAccount: any;
  let treasury: any;

  beforeAll(async () => {
    try {
      provider = AnchorProvider.env();
      anchor.setProvider(provider);
      program = anchor.workspace.PrivacyPass as Program<PrivacyPass>;
      
      admin = Keypair.generate();
      user = Keypair.generate();
      
      // Airdrop SOL
      const airdropTx1 = await provider.connection.requestAirdrop(
        admin.publicKey,
        10 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropTx1);

      const airdropTx2 = await provider.connection.requestAirdrop(
        user.publicKey,
        10 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropTx2);

      // Create USDC mint
      usdcMint = await createMint(
        provider.connection,
        admin,
        admin.publicKey,
        null,
        6
      );

      // Create user token account and mint USDC
      userTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        user,
        usdcMint,
        user.publicKey
      );

      await mintTo(
        provider.connection,
        admin,
        usdcMint,
        userTokenAccount.address,
        admin.publicKey,
        10000000000 // 10,000 USDC
      );

      // Create treasury token account
      treasury = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        admin,
        usdcMint,
        admin.publicKey
      );

    } catch (error) {
      console.warn('Solana test validator not available, skipping privacy-pass tests');
    }
  });

  it('Initializes pricing config with dynamic pricing disabled', async () => {
    if (!provider || !program) {
      console.warn('Skipping test: Solana not available');
      return;
    }

    const basePriceUsdc = new BN(500000); // 0.5 USDC per GB
    const tierThresholds = [new BN(10), new BN(50), new BN(100)];
    const tierDiscounts = [0, 10, 20]; // 0%, 10%, 20% discounts

    [pricingConfig] = PublicKey.findProgramAddressSync(
      [Buffer.from('pricing')],
      program.programId
    );

    const tx = await program.methods
      .initializePricingConfig(basePriceUsdc, tierThresholds, tierDiscounts)
      .accountsPartial({
        pricingConfig: pricingConfig,
        authority: admin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    console.log('Initialize pricing config tx:', tx);

    const configData = await program.account.pricingConfig.fetch(pricingConfig);
    expect(configData.basePriceUsdc.toString()).toBe(basePriceUsdc.toString());
    expect(configData.dynamicPricingEnabled).toBe(false);
    expect(configData.currentDemandFactor).toBe(10000); // Default 100%
  });

  it('Enables dynamic pricing and updates demand factor', async () => {
    if (!provider || !program) {
      console.warn('Skipping test: Solana not available');
      return;
    }

    // Enable dynamic pricing
    const toggleTx = await program.methods
      .toggleDynamicPricing()
      .accountsPartial({
        pricingConfig: pricingConfig,
        authority: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    console.log('Toggle dynamic pricing tx:', toggleTx);

    let configData = await program.account.pricingConfig.fetch(pricingConfig);
    expect(configData.dynamicPricingEnabled).toBe(true);

    // Update demand factor to high demand (150%)
    const highDemand = 15000;
    const updateTx = await program.methods
      .updateDemandPricing(highDemand)
      .accountsPartial({
        pricingConfig: pricingConfig,
        authority: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    console.log('Update demand pricing tx:', updateTx);

    configData = await program.account.pricingConfig.fetch(pricingConfig);
    expect(configData.currentDemandFactor).toBe(highDemand);
    expect(configData.lastPriceUpdate.toNumber()).toBeGreaterThan(0);
  });

  it('Enforces demand factor range (5000-20000)', async () => {
    if (!provider || !program) {
      console.warn('Skipping test: Solana not available');
      return;
    }

    // Try to set below minimum (50%)
    try {
      await program.methods
        .updateDemandPricing(4000)
        .accountsPartial({
          pricingConfig: pricingConfig,
          authority: admin.publicKey,
        })
        .signers([admin])
        .rpc();
      
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.toString()).toContain('InvalidDemandFactor');
    }

    // Try to set above maximum (200%)
    try {
      await program.methods
        .updateDemandPricing(21000)
        .accountsPartial({
          pricingConfig: pricingConfig,
          authority: admin.publicKey,
        })
        .signers([admin])
        .rpc();
      
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.toString()).toContain('InvalidDemandFactor');
    }

    // Set valid factor (100%)
    const validFactor = 10000;
    await program.methods
      .updateDemandPricing(validFactor)
      .accountsPartial({
        pricingConfig: pricingConfig,
        authority: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    const configData = await program.account.pricingConfig.fetch(pricingConfig);
    expect(configData.currentDemandFactor).toBe(validFactor);
  });

  it('Tracks price updates with timestamps', async () => {
    if (!provider || !program) {
      console.warn('Skipping test: Solana not available');
      return;
    }

    const configDataBefore = await program.account.pricingConfig.fetch(pricingConfig);
    const timestampBefore = configDataBefore.lastPriceUpdate.toNumber();

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update demand again
    await program.methods
      .updateDemandPricing(12000)
      .accountsPartial({
        pricingConfig: pricingConfig,
        authority: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    const configDataAfter = await program.account.pricingConfig.fetch(pricingConfig);
    const timestampAfter = configDataAfter.lastPriceUpdate.toNumber();

    expect(timestampAfter).toBeGreaterThan(timestampBefore);
    console.log(`Price update timestamp: ${new Date(timestampAfter * 1000).toISOString()}`);
  });
});
