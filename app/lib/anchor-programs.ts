import { AnchorProvider, Program, web3, BN } from '@coral-xyz/anchor';
import { Connection, PublicKey, Transaction, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createTransferInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { PROGRAM_IDS } from './veilpool';

// Privacy Pass Program Instructions
export async function createMintPassInstruction(
  userPublicKey: PublicKey,
  tierId: string,
  bandwidthGb: number,
  durationDays: number,
  connection: Connection
) {
  const [passAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('pass'), userPublicKey.toBuffer(), Buffer.from(tierId)],
    PROGRAM_IDS.PRIVACY_PASS
  );

  const [pricingConfig] = PublicKey.findProgramAddressSync(
    [Buffer.from('pricing_config')],
    PROGRAM_IDS.PRIVACY_PASS
  );

  const [treasury] = PublicKey.findProgramAddressSync(
    [Buffer.from('treasury')],
    PROGRAM_IDS.PRIVACY_PASS
  );

  // Create instruction data
  const data = Buffer.alloc(1 + 8 + 4);
  data.writeUInt8(0, 0); // Instruction discriminator for mint_pass
  data.writeBigUInt64LE(BigInt(bandwidthGb * 1e9), 1); // bandwidth in bytes
  data.writeUInt32LE(durationDays, 9);

  const instruction = new web3.TransactionInstruction({
    keys: [
      { pubkey: passAccount, isSigner: false, isWritable: true },
      { pubkey: userPublicKey, isSigner: true, isWritable: true },
      { pubkey: pricingConfig, isSigner: false, isWritable: false },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_IDS.PRIVACY_PASS,
    data,
  });

  return { instruction, passAccount, treasury };
}

// SPL Token Transfer for USDC/USDT payments
export async function createTokenTransferInstruction(
  fromPublicKey: PublicKey,
  toPublicKey: PublicKey,
  mint: PublicKey,
  amount: number,
  decimals: number,
  connection: Connection
) {
  const fromTokenAccount = await getAssociatedTokenAddress(mint, fromPublicKey);
  const toTokenAccount = await getAssociatedTokenAddress(mint, toPublicKey);

  // Check if destination token account exists
  const toAccountInfo = await connection.getAccountInfo(toTokenAccount);
  const instructions: web3.TransactionInstruction[] = [];

  if (!toAccountInfo) {
    // Create associated token account for recipient
    instructions.push(
      createAssociatedTokenAccountInstruction(
        fromPublicKey, // payer
        toTokenAccount,
        toPublicKey, // owner
        mint
      )
    );
  }

  // Add transfer instruction
  const transferAmount = Math.floor(amount * Math.pow(10, decimals));
  instructions.push(
    createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      fromPublicKey,
      transferAmount,
      [],
      TOKEN_PROGRAM_ID
    )
  );

  return instructions;
}

// Node Registry: Register Node
export async function createRegisterNodeInstruction(
  operatorPublicKey: PublicKey,
  country: string,
  city: string,
  ipAddress: string,
  bandwidth: number,
  stakeAmount: number
) {
  const [nodeAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('node'), operatorPublicKey.toBuffer()],
    PROGRAM_IDS.NODE_REGISTRY
  );

  const [registryAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('registry')],
    PROGRAM_IDS.NODE_REGISTRY
  );

  const [stakeAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('stake'), nodeAccount.toBuffer()],
    PROGRAM_IDS.NODE_REGISTRY
  );

  // Create instruction data
  const countryBytes = Buffer.from(country.padEnd(64, '\0'));
  const cityBytes = Buffer.from(city.padEnd(64, '\0'));
  const ipBytes = Buffer.from(ipAddress.padEnd(45, '\0'));
  
  const data = Buffer.alloc(1 + 64 + 64 + 45 + 2);
  data.writeUInt8(0, 0); // Instruction discriminator
  countryBytes.copy(data, 1);
  cityBytes.copy(data, 65);
  ipBytes.copy(data, 129);
  data.writeUInt16LE(bandwidth, 174);

  const instruction = new web3.TransactionInstruction({
    keys: [
      { pubkey: nodeAccount, isSigner: false, isWritable: true },
      { pubkey: operatorPublicKey, isSigner: true, isWritable: true },
      { pubkey: registryAccount, isSigner: false, isWritable: true },
      { pubkey: stakeAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_IDS.NODE_REGISTRY,
    data,
  });

  return { instruction, nodeAccount, stakeAccount };
}

// Privacy Pool: Create Pool
export async function createPrivacyPoolInstruction(
  sponsorPublicKey: PublicKey,
  poolName: string,
  description: string,
  fundingAmount: number
) {
  const poolId = new BN(Date.now());
  
  const [poolAccount] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('pool'),
      sponsorPublicKey.toBuffer(),
      poolId.toArrayLike(Buffer, 'le', 8)
    ],
    PROGRAM_IDS.PRIVACY_POOL
  );

  const [poolVault] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('pool_vault'),
      sponsorPublicKey.toBuffer(),
      poolId.toArrayLike(Buffer, 'le', 8)
    ],
    PROGRAM_IDS.PRIVACY_POOL
  );

  const nameBytes = Buffer.from(poolName.padEnd(64, '\0'));
  const descBytes = Buffer.from(description.padEnd(256, '\0'));
  
  const data = Buffer.alloc(1 + 8 + 64 + 256 + 8);
  data.writeUInt8(0, 0);
  poolId.toArrayLike(Buffer, 'le', 8).copy(data, 1);
  nameBytes.copy(data, 9);
  descBytes.copy(data, 73);
  data.writeBigUInt64LE(BigInt(fundingAmount * web3.LAMPORTS_PER_SOL), 329);

  const instruction = new web3.TransactionInstruction({
    keys: [
      { pubkey: poolAccount, isSigner: false, isWritable: true },
      { pubkey: poolVault, isSigner: false, isWritable: true },
      { pubkey: sponsorPublicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_IDS.PRIVACY_POOL,
    data,
  });

  return { instruction, poolAccount, poolVault, poolId };
}

// Parse on-chain account data helpers
export function parseNodeAccount(data: Buffer) {
  return {
    operator: new PublicKey(data.slice(8, 40)).toBase58(),
    stakeAmount: Number(data.readBigUInt64LE(40)),
    reputation: data.readUInt8(48),
    country: data.slice(49, 113).toString('utf8').replace(/\0/g, ''),
    city: data.slice(113, 177).toString('utf8').replace(/\0/g, ''),
    ipAddress: data.slice(177, 222).toString('utf8').replace(/\0/g, ''),
    bandwidthGbps: data.readUInt16LE(222),
    totalBandwidthServed: Number(data.readBigUInt64LE(224)),
    uptimePercentage: data.readUInt8(232),
    lastHeartbeat: Number(data.readBigInt64LE(233)),
    earningsAccumulated: Number(data.readBigUInt64LE(241)),
    isActive: data.readUInt8(249) === 1,
    registeredAt: Number(data.readBigInt64LE(250)),
  };
}

export function parsePrivacyPassAccount(data: Buffer) {
  return {
    owner: new PublicKey(data.slice(8, 40)).toBase58(),
    remainingGb: Number(data.readBigUInt64LE(40)) / 1e9,
    totalGb: Number(data.readBigUInt64LE(48)) / 1e9,
    expiresAt: Number(data.readBigInt64LE(56)),
    createdAt: Number(data.readBigInt64LE(64)),
    isActive: data.readUInt8(72) === 1,
    tierId: data.slice(73, 105).toString('utf8').replace(/\0/g, ''),
  };
}

export function parsePrivacyPoolAccount(data: Buffer) {
  return {
    sponsor: new PublicKey(data.slice(8, 40)).toBase58(),
    poolId: Number(data.readBigUInt64LE(40)),
    name: data.slice(48, 112).toString('utf8').replace(/\0/g, ''),
    description: data.slice(112, 368).toString('utf8').replace(/\0/g, ''),
    totalFunded: Number(data.readBigUInt64LE(368)),
    totalUsed: Number(data.readBigUInt64LE(376)),
    beneficiaryCount: data.readUInt32LE(384),
    isActive: data.readUInt8(388) === 1,
    createdAt: Number(data.readBigInt64LE(389)),
  };
}
