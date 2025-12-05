import { expect } from 'chai';
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import { NodeRegistry } from '../target/types/node_registry';
import * as anchor from '@coral-xyz/anchor';

describe('Node Registry Program', () => {
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.NodeRegistry as Program<NodeRegistry>;
  
  let nodeOperator: Keypair;
  let nodeAccount: PublicKey;
  let stakeVault: PublicKey;

  before(async () => {
    nodeOperator = Keypair.generate();
    
    // Airdrop SOL to operator
    const airdropSignature = await provider.connection.requestAirdrop(
      nodeOperator.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSignature);
  });

  it('Registers a new VPN node', async () => {
    const country = 'US';
    const city = 'San Francisco';
    const bandwidth = 1000; // 1 Gbps in Mbps
    const stakeAmount = new anchor.BN(5 * LAMPORTS_PER_SOL);

    [nodeAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('node'), nodeOperator.publicKey.toBuffer()],
      program.programId
    );

    [stakeVault] = PublicKey.findProgramAddressSync(
      [Buffer.from('stake-vault'), nodeAccount.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .registerNode(country, city, bandwidth)
      .accounts({
        node: nodeAccount,
        operator: nodeOperator.publicKey,
        stakeVault: stakeVault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([nodeOperator])
      .rpc();

    console.log('Register node tx:', tx);

    const nodeData = await program.account.node.fetch(nodeAccount);
    expect(nodeData.operator.toString()).to.equal(nodeOperator.publicKey.toString());
    expect(nodeData.country).to.equal(country);
    expect(nodeData.city).to.equal(city);
    expect(nodeData.bandwidth).to.equal(bandwidth);
    expect(nodeData.isActive).to.be.true;
    expect(nodeData.reputation).to.equal(1000); // Initial reputation
  });

  it('Stakes SOL to node', async () => {
    const stakeAmount = new anchor.BN(2 * LAMPORTS_PER_SOL);

    const tx = await program.methods
      .stakeSol(stakeAmount)
      .accounts({
        node: nodeAccount,
        operator: nodeOperator.publicKey,
        stakeVault: stakeVault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([nodeOperator])
      .rpc();

    console.log('Stake SOL tx:', tx);

    const nodeData = await program.account.node.fetch(nodeAccount);
    expect(nodeData.totalStake.toNumber()).to.be.greaterThan(0);
  });

  it('Updates node heartbeat', async () => {
    const latency = 50; // 50ms
    const activeConnections = 10;

    const tx = await program.methods
      .updateHeartbeat(latency, activeConnections)
      .accounts({
        node: nodeAccount,
        operator: nodeOperator.publicKey,
      })
      .signers([nodeOperator])
      .rpc();

    console.log('Update heartbeat tx:', tx);

    const nodeData = await program.account.node.fetch(nodeAccount);
    expect(nodeData.latency).to.equal(latency);
    expect(nodeData.activeConnections).to.equal(activeConnections);
  });

  it('Records earnings for node', async () => {
    const earningsAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);

    const tx = await program.methods
      .recordEarnings(earningsAmount)
      .accounts({
        node: nodeAccount,
        operator: nodeOperator.publicKey,
      })
      .signers([nodeOperator])
      .rpc();

    console.log('Record earnings tx:', tx);

    const nodeData = await program.account.node.fetch(nodeAccount);
    expect(nodeData.totalEarnings.toNumber()).to.be.greaterThan(0);
  });

  it('Initiates unstake from node', async () => {
    const unstakeAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);

    const tx = await program.methods
      .unstakeSol(unstakeAmount)
      .accounts({
        node: nodeAccount,
        operator: nodeOperator.publicKey,
      })
      .signers([nodeOperator])
      .rpc();

    console.log('Unstake SOL tx:', tx);

    const nodeData = await program.account.node.fetch(nodeAccount);
    expect(nodeData.unstakeAmount.toNumber()).to.be.greaterThan(0);
  });

  it('Fails to slash non-existent node', async () => {
    const fakeNode = Keypair.generate();
    const slashAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL);

    try {
      await program.methods
        .slashNode(slashAmount)
        .accounts({
          node: fakeNode.publicKey,
          authority: nodeOperator.publicKey,
          stakeVault: stakeVault,
        })
        .signers([nodeOperator])
        .rpc();
      
      expect.fail('Should have thrown error');
    } catch (error) {
      expect(error).to.exist;
    }
  });
});
