import { expect } from 'chai';
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import { PrivacyPass } from '../target/types/privacy_pass';
import * as anchor from '@coral-xyz/anchor';

describe('Privacy Pass Program', () => {
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PrivacyPass as Program<PrivacyPass>;
  
  let user: Keypair;
  let passSystem: PublicKey;
  let userPass: PublicKey;

  before(async () => {
    user = Keypair.generate();
    
    // Airdrop SOL to user
    const airdropSignature = await provider.connection.requestAirdrop(
      user.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSignature);
  });

  it('Initializes pass system', async () => {
    [passSystem] = PublicKey.findProgramAddressSync(
      [Buffer.from('pass-system')],
      program.programId
    );

    const basicPrice = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
    const premiumPrice = new anchor.BN(0.5 * LAMPORTS_PER_SOL);
    const enterprisePrice = new anchor.BN(2 * LAMPORTS_PER_SOL);

    const tx = await program.methods
      .initializePassSystem(basicPrice, premiumPrice, enterprisePrice)
      .accounts({
        passSystem: passSystem,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log('Initialize pass system tx:', tx);

    const systemData = await program.account.passSystem.fetch(passSystem);
    expect(systemData.authority.toString()).to.equal(provider.wallet.publicKey.toString());
    expect(systemData.totalPasses.toNumber()).to.equal(0);
  });

  it('Purchases a basic pass', async () => {
    [userPass] = PublicKey.findProgramAddressSync(
      [Buffer.from('pass'), user.publicKey.toBuffer()],
      program.programId
    );

    const duration = 30; // 30 days

    const tx = await program.methods
      .purchasePass(0, duration) // 0 = Basic tier
      .accounts({
        pass: userPass,
        user: user.publicKey,
        passSystem: passSystem,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    console.log('Purchase pass tx:', tx);

    const passData = await program.account.privacyPass.fetch(userPass);
    expect(passData.owner.toString()).to.equal(user.publicKey.toString());
    expect(passData.tier).to.equal(0); // Basic
    expect(passData.isActive).to.be.true;
  });

  it('Redeems pass usage', async () => {
    const dataUsed = new anchor.BN(1024 * 1024 * 100); // 100 MB

    const tx = await program.methods
      .redeemPass(dataUsed)
      .accounts({
        pass: userPass,
        user: user.publicKey,
      })
      .signers([user])
      .rpc();

    console.log('Redeem pass tx:', tx);

    const passData = await program.account.privacyPass.fetch(userPass);
    expect(passData.usageCount.toNumber()).to.be.greaterThan(0);
  });

  it('Extends pass expiry', async () => {
    const additionalDays = 15;

    const tx = await program.methods
      .extendExpiry(additionalDays)
      .accounts({
        pass: userPass,
        user: user.publicKey,
      })
      .signers([user])
      .rpc();

    console.log('Extend expiry tx:', tx);

    const passData = await program.account.privacyPass.fetch(userPass);
    expect(passData.expiresAt.toNumber()).to.be.greaterThan(Date.now() / 1000);
  });

  it('Fails to purchase with insufficient funds', async () => {
    const poorUser = Keypair.generate();
    
    const [poorUserPass] = PublicKey.findProgramAddressSync(
      [Buffer.from('pass'), poorUser.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .purchasePass(2, 30) // Enterprise tier (expensive)
        .accounts({
          pass: poorUserPass,
          user: poorUser.publicKey,
          passSystem: passSystem,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([poorUser])
        .rpc();
      
      expect.fail('Should have thrown error');
    } catch (error) {
      expect(error).to.exist;
    }
  });

  it('Purchases premium subscription', async () => {
    const premiumUser = Keypair.generate();
    
    // Airdrop SOL
    const airdropSignature = await provider.connection.requestAirdrop(
      premiumUser.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSignature);

    const [premiumPass] = PublicKey.findProgramAddressSync(
      [Buffer.from('pass'), premiumUser.publicKey.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .purchaseSubscription(1, 365) // Premium tier, 1 year
      .accounts({
        pass: premiumPass,
        user: premiumUser.publicKey,
        passSystem: passSystem,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([premiumUser])
      .rpc();

    console.log('Purchase subscription tx:', tx);

    const passData = await program.account.privacyPass.fetch(premiumPass);
    expect(passData.tier).to.equal(1); // Premium
    expect(passData.autoRenew).to.be.true;
  });
});
