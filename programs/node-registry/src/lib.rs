use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("NodE1111111111111111111111111111111111111111");

const MIN_STAKE: u64 = 100_000_000_000;
const UNBONDING_PERIOD: i64 = 604800;
const MIN_REPUTATION: u8 = 50;
const PROTOCOL_FEE_BPS: u16 = 2000;
const DOWNTIME_SLASH_BPS: u16 = 500;
const MALICIOUS_SLASH_BPS: u16 = 5000;

#[program]
pub mod node_registry {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let registry = &mut ctx.accounts.global_registry;
        registry.authority = ctx.accounts.authority.key();
        registry.total_nodes = 0;
        registry.total_stake = 0;
        registry.protocol_fee_vault = ctx.accounts.protocol_fee_vault.key();
        registry.total_bandwidth_served = 0;
        registry.total_earnings_distributed = 0;
        
        emit!(RegistryInitialized {
            authority: registry.authority,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    pub fn register_node(
        ctx: Context<RegisterNode>,
        location: String,
        ip_address: String,
        bandwidth_gbps: u16,
    ) -> Result<()> {
        require!(location.len() <= 64, ErrorCode::LocationTooLong);
        require!(ip_address.len() <= 45, ErrorCode::IpAddressTooLong);
        require!(bandwidth_gbps > 0, ErrorCode::InvalidBandwidth);

        let node = &mut ctx.accounts.node_account;
        let clock = Clock::get()?;

        node.operator = ctx.accounts.operator.key();
        node.stake_amount = 0;
        node.reputation = 100;
        node.location = location.clone();
        node.ip_address = ip_address.clone();
        node.bandwidth_gbps = bandwidth_gbps;
        node.total_bandwidth_served = 0;
        node.uptime_percentage = 100;
        node.last_heartbeat = clock.unix_timestamp;
        node.earnings_accumulated = 0;
        node.is_active = false;
        node.registered_at = clock.unix_timestamp;
        node.unbonding_until = 0;
        node.slash_count = 0;

        let registry = &mut ctx.accounts.global_registry;
        registry.total_nodes = registry.total_nodes.checked_add(1).unwrap();

        emit!(NodeRegistered {
            operator: node.operator,
            location,
            ip_address,
            bandwidth_gbps,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn stake_sol(ctx: Context<StakeSol>, amount: u64) -> Result<()> {
        require!(amount >= MIN_STAKE, ErrorCode::InsufficientStake);

        let node = &mut ctx.accounts.node_account;
        let registry = &mut ctx.accounts.global_registry;

        let transfer_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.operator.to_account_info(),
                to: ctx.accounts.stake_vault.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(transfer_ctx, amount)?;

        node.stake_amount = node.stake_amount.checked_add(amount).unwrap();
        registry.total_stake = registry.total_stake.checked_add(amount).unwrap();
        
        if node.stake_amount >= MIN_STAKE && !node.is_active {
            node.is_active = true;
        }

        emit!(StakeDeposited {
            operator: node.operator,
            amount,
            total_stake: node.stake_amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn unstake_sol(ctx: Context<UnstakeSol>, amount: u64) -> Result<()> {
        let node = &mut ctx.accounts.node_account;
        require!(node.stake_amount >= amount, ErrorCode::InsufficientBalance);
        
        let remaining = node.stake_amount.checked_sub(amount).unwrap();
        require!(remaining == 0 || remaining >= MIN_STAKE, ErrorCode::InsufficientStake);

        let clock = Clock::get()?;
        node.unbonding_until = clock.unix_timestamp.checked_add(UNBONDING_PERIOD).unwrap();
        node.is_active = false;

        emit!(UnstakeInitiated {
            operator: node.operator,
            amount,
            unbonding_until: node.unbonding_until,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn withdraw_unstaked(ctx: Context<WithdrawUnstaked>) -> Result<()> {
        let node = &ctx.accounts.node_account;
        let clock = Clock::get()?;
        
        require!(node.unbonding_until > 0, ErrorCode::NoUnbondingInProgress);
        require!(clock.unix_timestamp >= node.unbonding_until, ErrorCode::UnbondingPeriodActive);

        let amount = node.stake_amount;
        let registry = &mut ctx.accounts.global_registry;

        let node_key = ctx.accounts.node_account.key();
        let bump = ctx.bumps.stake_vault;
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"stake",
            node_key.as_ref(),
            &[bump],
        ]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.stake_vault.to_account_info(),
                to: ctx.accounts.operator.to_account_info(),
            },
            signer_seeds,
        );
        anchor_lang::system_program::transfer(transfer_ctx, amount)?;

        let node = &mut ctx.accounts.node_account;
        node.stake_amount = 0;
        node.unbonding_until = 0;
        registry.total_stake = registry.total_stake.checked_sub(amount).unwrap();

        emit!(StakeWithdrawn {
            operator: node.operator,
            amount,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn update_heartbeat(ctx: Context<UpdateHeartbeat>, bandwidth_served_gb: u64) -> Result<()> {
        let node = &mut ctx.accounts.node_account;
        let clock = Clock::get()?;
        
        require!(node.is_active, ErrorCode::NodeNotActive);

        node.last_heartbeat = clock.unix_timestamp;
        node.total_bandwidth_served = node.total_bandwidth_served.checked_add(bandwidth_served_gb).unwrap();

        let registry = &mut ctx.accounts.global_registry;
        registry.total_bandwidth_served = registry.total_bandwidth_served.checked_add(bandwidth_served_gb).unwrap();

        emit!(HeartbeatUpdated {
            operator: node.operator,
            timestamp: clock.unix_timestamp,
            bandwidth_served_gb,
        });

        Ok(())
    }

    pub fn update_reputation(ctx: Context<UpdateReputation>, new_score: u8) -> Result<()> {
        require!(new_score <= 100, ErrorCode::InvalidReputation);

        let node = &mut ctx.accounts.node_account;
        let old_score = node.reputation;
        node.reputation = new_score;

        emit!(ReputationUpdated {
            operator: node.operator,
            old_score,
            new_score,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn slash_node(ctx: Context<SlashNode>, violation_type: ViolationType) -> Result<()> {
        let node = &mut ctx.accounts.node_account;
        let registry = &mut ctx.accounts.global_registry;
        
        require!(node.is_active, ErrorCode::NodeNotActive);

        let slash_bps = match violation_type {
            ViolationType::Downtime => DOWNTIME_SLASH_BPS,
            ViolationType::Malicious => MALICIOUS_SLASH_BPS,
        };

        let slash_amount = node.stake_amount
            .checked_mul(slash_bps as u64).unwrap()
            .checked_div(10000).unwrap();

        let node_key = ctx.accounts.node_account.key();
        let bump = ctx.bumps.stake_vault;
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"stake",
            node_key.as_ref(),
            &[bump],
        ]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.stake_vault.to_account_info(),
                to: ctx.accounts.protocol_fee_vault.to_account_info(),
            },
            signer_seeds,
        );
        anchor_lang::system_program::transfer(transfer_ctx, slash_amount)?;

        node.stake_amount = node.stake_amount.checked_sub(slash_amount).unwrap();
        node.slash_count = node.slash_count.checked_add(1).unwrap();
        registry.total_stake = registry.total_stake.checked_sub(slash_amount).unwrap();

        if node.stake_amount < MIN_STAKE {
            node.is_active = false;
        }

        emit!(NodeSlashed {
            operator: node.operator,
            violation_type,
            slash_amount,
            remaining_stake: node.stake_amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn record_earnings(ctx: Context<RecordEarnings>, amount: u64) -> Result<()> {
        let node = &mut ctx.accounts.node_account;
        require!(node.is_active, ErrorCode::NodeNotActive);

        let protocol_fee = amount
            .checked_mul(PROTOCOL_FEE_BPS as u64).unwrap()
            .checked_div(10000).unwrap();
        
        let operator_earnings = amount.checked_sub(protocol_fee).unwrap();

        node.earnings_accumulated = node.earnings_accumulated.checked_add(operator_earnings).unwrap();

        let registry = &mut ctx.accounts.global_registry;
        registry.total_earnings_distributed = registry.total_earnings_distributed.checked_add(amount).unwrap();

        emit!(EarningsRecorded {
            operator: node.operator,
            amount: operator_earnings,
            protocol_fee,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn claim_earnings(ctx: Context<ClaimEarnings>) -> Result<()> {
        let node = &mut ctx.accounts.node_account;
        require!(node.earnings_accumulated > 0, ErrorCode::NoEarningsToClaim);

        let amount = node.earnings_accumulated;

        let transfer_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.earnings_vault.to_account_info(),
                to: ctx.accounts.operator.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(transfer_ctx, amount)?;

        node.earnings_accumulated = 0;

        emit!(EarningsClaimed {
            operator: node.operator,
            amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn deactivate_node(ctx: Context<DeactivateNode>) -> Result<()> {
        let node = &mut ctx.accounts.node_account;
        require!(node.is_active, ErrorCode::NodeNotActive);

        node.is_active = false;

        emit!(NodeDeactivated {
            operator: node.operator,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn reactivate_node(ctx: Context<ReactivateNode>) -> Result<()> {
        let node = &mut ctx.accounts.node_account;
        require!(!node.is_active, ErrorCode::NodeAlreadyActive);
        require!(node.stake_amount >= MIN_STAKE, ErrorCode::InsufficientStake);
        require!(node.reputation >= MIN_REPUTATION, ErrorCode::LowReputation);

        node.is_active = true;

        emit!(NodeReactivated {
            operator: node.operator,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + GlobalRegistry::LEN,
        seeds = [b"registry"],
        bump
    )]
    pub global_registry: Account<'info, GlobalRegistry>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: Protocol fee vault
    pub protocol_fee_vault: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterNode<'info> {
    #[account(
        init,
        payer = operator,
        space = 8 + NodeAccount::LEN,
        seeds = [b"node", operator.key().as_ref()],
        bump
    )]
    pub node_account: Account<'info, NodeAccount>,
    
    #[account(
        mut,
        seeds = [b"registry"],
        bump
    )]
    pub global_registry: Account<'info, GlobalRegistry>,
    
    #[account(mut)]
    pub operator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StakeSol<'info> {
    #[account(
        mut,
        seeds = [b"node", operator.key().as_ref()],
        bump,
        has_one = operator
    )]
    pub node_account: Account<'info, NodeAccount>,
    
    #[account(
        mut,
        seeds = [b"stake", node_account.key().as_ref()],
        bump
    )]
    pub stake_vault: SystemAccount<'info>,
    
    #[account(
        mut,
        seeds = [b"registry"],
        bump
    )]
    pub global_registry: Account<'info, GlobalRegistry>,
    
    #[account(mut)]
    pub operator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UnstakeSol<'info> {
    #[account(
        mut,
        seeds = [b"node", operator.key().as_ref()],
        bump,
        has_one = operator
    )]
    pub node_account: Account<'info, NodeAccount>,
    
    #[account(mut)]
    pub operator: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawUnstaked<'info> {
    #[account(
        mut,
        seeds = [b"node", operator.key().as_ref()],
        bump,
        has_one = operator
    )]
    pub node_account: Account<'info, NodeAccount>,
    
    #[account(
        mut,
        seeds = [b"stake", node_account.key().as_ref()],
        bump
    )]
    pub stake_vault: SystemAccount<'info>,
    
    #[account(
        mut,
        seeds = [b"registry"],
        bump
    )]
    pub global_registry: Account<'info, GlobalRegistry>,
    
    #[account(mut)]
    pub operator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateHeartbeat<'info> {
    #[account(
        mut,
        seeds = [b"node", operator.key().as_ref()],
        bump,
        has_one = operator
    )]
    pub node_account: Account<'info, NodeAccount>,
    
    #[account(
        mut,
        seeds = [b"registry"],
        bump
    )]
    pub global_registry: Account<'info, GlobalRegistry>,
    
    pub operator: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateReputation<'info> {
    #[account(
        mut,
        seeds = [b"node", node_account.operator.as_ref()],
        bump
    )]
    pub node_account: Account<'info, NodeAccount>,
    
    #[account(
        seeds = [b"registry"],
        bump,
        has_one = authority
    )]
    pub global_registry: Account<'info, GlobalRegistry>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SlashNode<'info> {
    #[account(
        mut,
        seeds = [b"node", node_account.operator.as_ref()],
        bump
    )]
    pub node_account: Account<'info, NodeAccount>,
    
    #[account(
        mut,
        seeds = [b"stake", node_account.key().as_ref()],
        bump
    )]
    pub stake_vault: SystemAccount<'info>,
    
    #[account(
        mut,
        seeds = [b"registry"],
        bump,
        has_one = authority,
        has_one = protocol_fee_vault
    )]
    pub global_registry: Account<'info, GlobalRegistry>,
    
    /// CHECK: Protocol fee vault
    #[account(mut)]
    pub protocol_fee_vault: AccountInfo<'info>,
    
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordEarnings<'info> {
    #[account(
        mut,
        seeds = [b"node", operator.key().as_ref()],
        bump,
        has_one = operator
    )]
    pub node_account: Account<'info, NodeAccount>,
    
    #[account(
        mut,
        seeds = [b"registry"],
        bump
    )]
    pub global_registry: Account<'info, GlobalRegistry>,
    
    pub operator: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimEarnings<'info> {
    #[account(
        mut,
        seeds = [b"node", operator.key().as_ref()],
        bump,
        has_one = operator
    )]
    pub node_account: Account<'info, NodeAccount>,
    
    /// CHECK: Earnings vault
    #[account(mut)]
    pub earnings_vault: AccountInfo<'info>,
    
    #[account(mut)]
    pub operator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeactivateNode<'info> {
    #[account(
        mut,
        seeds = [b"node", operator.key().as_ref()],
        bump,
        has_one = operator
    )]
    pub node_account: Account<'info, NodeAccount>,
    
    pub operator: Signer<'info>,
}

#[derive(Accounts)]
pub struct ReactivateNode<'info> {
    #[account(
        mut,
        seeds = [b"node", operator.key().as_ref()],
        bump,
        has_one = operator
    )]
    pub node_account: Account<'info, NodeAccount>,
    
    pub operator: Signer<'info>,
}

#[account]
pub struct GlobalRegistry {
    pub authority: Pubkey,
    pub total_nodes: u32,
    pub total_stake: u64,
    pub protocol_fee_vault: Pubkey,
    pub total_bandwidth_served: u64,
    pub total_earnings_distributed: u64,
}

impl GlobalRegistry {
    pub const LEN: usize = 32 + 4 + 8 + 32 + 8 + 8;
}

#[account]
pub struct NodeAccount {
    pub operator: Pubkey,
    pub stake_amount: u64,
    pub reputation: u8,
    pub location: String,
    pub ip_address: String,
    pub bandwidth_gbps: u16,
    pub total_bandwidth_served: u64,
    pub uptime_percentage: u8,
    pub last_heartbeat: i64,
    pub earnings_accumulated: u64,
    pub is_active: bool,
    pub registered_at: i64,
    pub unbonding_until: i64,
    pub slash_count: u16,
}

impl NodeAccount {
    pub const LEN: usize = 32 + 8 + 1 + (4 + 64) + (4 + 45) + 2 + 8 + 1 + 8 + 8 + 1 + 8 + 8 + 2;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ViolationType {
    Downtime,
    Malicious,
}

#[event]
pub struct RegistryInitialized {
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct NodeRegistered {
    pub operator: Pubkey,
    pub location: String,
    pub ip_address: String,
    pub bandwidth_gbps: u16,
    pub timestamp: i64,
}

#[event]
pub struct StakeDeposited {
    pub operator: Pubkey,
    pub amount: u64,
    pub total_stake: u64,
    pub timestamp: i64,
}

#[event]
pub struct UnstakeInitiated {
    pub operator: Pubkey,
    pub amount: u64,
    pub unbonding_until: i64,
    pub timestamp: i64,
}

#[event]
pub struct StakeWithdrawn {
    pub operator: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct HeartbeatUpdated {
    pub operator: Pubkey,
    pub timestamp: i64,
    pub bandwidth_served_gb: u64,
}

#[event]
pub struct ReputationUpdated {
    pub operator: Pubkey,
    pub old_score: u8,
    pub new_score: u8,
    pub timestamp: i64,
}

#[event]
pub struct NodeSlashed {
    pub operator: Pubkey,
    pub violation_type: ViolationType,
    pub slash_amount: u64,
    pub remaining_stake: u64,
    pub timestamp: i64,
}

#[event]
pub struct EarningsRecorded {
    pub operator: Pubkey,
    pub amount: u64,
    pub protocol_fee: u64,
    pub timestamp: i64,
}

#[event]
pub struct EarningsClaimed {
    pub operator: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct NodeDeactivated {
    pub operator: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct NodeReactivated {
    pub operator: Pubkey,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Location string exceeds maximum length of 64 characters")]
    LocationTooLong,
    #[msg("IP address string exceeds maximum length of 45 characters")]
    IpAddressTooLong,
    #[msg("Bandwidth must be greater than 0")]
    InvalidBandwidth,
    #[msg("Insufficient stake amount. Minimum 100 SOL required")]
    InsufficientStake,
    #[msg("Insufficient balance for operation")]
    InsufficientBalance,
    #[msg("No unbonding in progress")]
    NoUnbondingInProgress,
    #[msg("Unbonding period still active. Please wait")]
    UnbondingPeriodActive,
    #[msg("Node is not active")]
    NodeNotActive,
    #[msg("Node is already active")]
    NodeAlreadyActive,
    #[msg("Invalid reputation score. Must be 0-100")]
    InvalidReputation,
    #[msg("Node reputation too low. Minimum score: 50")]
    LowReputation,
    #[msg("No earnings available to claim")]
    NoEarningsToClaim,
}
