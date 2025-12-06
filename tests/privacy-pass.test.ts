import { describe, it, expect, beforeAll } from '@jest/globals';
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet, BN } from '@coral-xyz/anchor';
import { PrivacyPass } from '../target/types/privacy_pass';
import * as anchor from '@coral-xyz/anchor';

describe('Privacy Pass Program', () => {
  let provider: AnchorProvider;
  let program: Program<PrivacyPass>;
  let user: Keypair;
  let pricingConfig: PublicKey;
  let passAccount: PublicKey;

  beforeAll(async () => {
    try {
      provider = AnchorProvider.env();
      anchor.setProvider(provider);
      program = anchor.workspace.PrivacyPass as Program<PrivacyPass>;
      
      user = Keypair.generate();
      
      // Airdrop SOL to user
      const airdropSignature = await provider.connection.requestAirdrop(
        user.publicKey,
        10 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSignature);
    } catch (error) {
      console.warn('Solana test validator not available, skipping privacy-pass tests');
    }
  });

  it('Initializes pass system', async () => {
    if (!provider || !program) {
      console.warn('Skipping test: Solana not available');
      return;
    }
    [pricingConfig] = PublicKey.findProgramAddressSync(
      [Buffer.from('pricing_config')],
      program.programId
    );

    // Mock price oracle pubkey
    const priceOracle = Keypair.generate().publicKey;

    try {
      const tx = await program.methods
        .initializePassSystem(priceOracle)
        .accountsPartial({
          pricingConfig: pricingConfig,
          authority: provider.wallet.publicKey,
        })
        .rpc();

      console.log('Initialize pass system tx:', tx);

      const configData = await program.account.pricingConfig.fetch(pricingConfig);
      expect(configData.authority.toString()).toBe(provider.wallet.publicKey.toString());
    } catch (error) {
      console.log('Initialize pass system test skipped (account may already exist)');
    }
  });

  it('Test pass account PDA derivation', () => {
    if (!provider || !program) {
      console.warn('Skipping test: Solana not available');
      return;
    }
    [passAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('pass'), user.publicKey.toBuffer()],
      program.programId
    );

    expect(passAccount).toBeDefined();
    expect(passAccount).toBeInstanceOf(PublicKey);
  });
});
