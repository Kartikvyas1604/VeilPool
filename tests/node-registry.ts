import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NodeRegistry } from "../target/types/node_registry";
import { expect } from "chai";

describe("node-registry", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.NodeRegistry as Program<NodeRegistry>;
  const authority = provider.wallet;
  
  let globalRegistry: anchor.web3.PublicKey;
  let nodeAccount: anchor.web3.PublicKey;
  let stakeVault: anchor.web3.PublicKey;

  const operator = anchor.web3.Keypair.generate();

  before(async () => {
    [globalRegistry] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("registry")],
      program.programId
    );

    [nodeAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("node"), operator.publicKey.toBuffer()],
      program.programId
    );

    [stakeVault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("stake"), nodeAccount.toBuffer()],
      program.programId
    );

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        operator.publicKey,
        150 * anchor.web3.LAMPORTS_PER_SOL
      )
    );
  });

  it("Initializes the registry", async () => {
    const tx = await program.methods
      .initialize()
      .accounts({
        globalRegistry,
        authority: authority.publicKey,
        protocolFeeVault: authority.publicKey,
      })
      .rpc();

    const registryAccount = await program.account.globalRegistry.fetch(globalRegistry);
    expect(registryAccount.totalNodes).to.equal(0);
    expect(registryAccount.authority.toString()).to.equal(authority.publicKey.toString());
  });

  it("Registers a new node", async () => {
    const tx = await program.methods
      .registerNode("US-WEST-1", "192.168.1.1", 10)
      .accounts({
        nodeAccount,
        globalRegistry,
        operator: operator.publicKey,
      })
      .signers([operator])
      .rpc();

    const node = await program.account.nodeAccount.fetch(nodeAccount);
    expect(node.operator.toString()).to.equal(operator.publicKey.toString());
    expect(node.location).to.equal("US-WEST-1");
    expect(node.reputation).to.equal(100);
    expect(node.isActive).to.equal(false);

    const registry = await program.account.globalRegistry.fetch(globalRegistry);
    expect(registry.totalNodes).to.equal(1);
  });

  it("Stakes SOL to activate node", async () => {
    const stakeAmount = 100 * anchor.web3.LAMPORTS_PER_SOL;

    const tx = await program.methods
      .stakeSol(new anchor.BN(stakeAmount))
      .accounts({
        nodeAccount,
        stakeVault,
        globalRegistry,
        operator: operator.publicKey,
      })
      .signers([operator])
      .rpc();

    const node = await program.account.nodeAccount.fetch(nodeAccount);
    expect(node.stakeAmount.toString()).to.equal(stakeAmount.toString());
    expect(node.isActive).to.equal(true);
  });

  it("Updates node heartbeat", async () => {
    const tx = await program.methods
      .updateHeartbeat(new anchor.BN(50))
      .accounts({
        nodeAccount,
        globalRegistry,
        operator: operator.publicKey,
      })
      .signers([operator])
      .rpc();

    const node = await program.account.nodeAccount.fetch(nodeAccount);
    expect(node.totalBandwidthServed.toString()).to.equal("50");
  });

  it("Updates reputation", async () => {
    const tx = await program.methods
      .updateReputation(95)
      .accounts({
        nodeAccount,
        globalRegistry,
        authority: authority.publicKey,
      })
      .rpc();

    const node = await program.account.nodeAccount.fetch(nodeAccount);
    expect(node.reputation).to.equal(95);
  });

  it("Fails to stake with insufficient amount", async () => {
    const newOperator = anchor.web3.Keypair.generate();
    
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        newOperator.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      )
    );

    const [newNodeAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("node"), newOperator.publicKey.toBuffer()],
      program.programId
    );

    const [newStakeVault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("stake"), newNodeAccount.toBuffer()],
      program.programId
    );

    await program.methods
      .registerNode("EU-CENTRAL-1", "10.0.0.1", 5)
      .accounts({
        nodeAccount: newNodeAccount,
        globalRegistry,
        operator: newOperator.publicKey,
      })
      .signers([newOperator])
      .rpc();

    try {
      await program.methods
        .stakeSol(new anchor.BN(50 * anchor.web3.LAMPORTS_PER_SOL))
        .accounts({
          nodeAccount: newNodeAccount,
          stakeVault: newStakeVault,
          globalRegistry,
          operator: newOperator.publicKey,
        })
        .signers([newOperator])
        .rpc();
      
      expect.fail("Should have failed with insufficient stake");
    } catch (error) {
      expect(error.toString()).to.include("InsufficientStake");
    }
  });
});
