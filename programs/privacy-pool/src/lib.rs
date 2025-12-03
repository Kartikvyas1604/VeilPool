use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("PooL1111111111111111111111111111111111111111");

const MAX_BENEFICIARIES: usize = 1000;
const MIN_ALLOCATION_GB: u64 = 1;
const MAX_POOL_NAME_LEN: usize = 128;

#[program]
pub mod privacy_pool {
    use super::*;

    pub fn create_pool(
        ctx: Context<CreatePool>,
        pool_id: u64,
        name: String,
        total_funding: u64,
        allocation_per_user: u64,
    ) -> Result<()> {
        require!(name.len() <= MAX_POOL_NAME_LEN, ErrorCode::PoolNameTooLong);
        require!(total_funding > 0, ErrorCode::InvalidFunding);
        require!(allocation_per_user >= MIN_ALLOCATION_GB, ErrorCode::AllocationTooSmall);

        let pool = &mut ctx.accounts.pool_account;
        let clock = Clock::get()?;

        pool.sponsor = ctx.accounts.sponsor.key();
        pool.pool_id = pool_id;
        pool.name = name.clone();
        pool.token_mint = ctx.accounts.token_mint.key();
        pool.total_funded = total_funding;
        pool.total_used = 0;
        pool.beneficiary_count = 0;
        pool.allocation_per_user = allocation_per_user;
        pool.is_active = true;
        pool.created_at = clock.unix_timestamp;
        pool.auto_refill_threshold = total_funding.checked_div(5).unwrap();
        pool.auto_refill_enabled = false;

        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.sponsor_token_account.to_account_info(),
                to: ctx.accounts.pool_vault.to_account_info(),
                authority: ctx.accounts.sponsor.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, total_funding)?;

        emit!(PoolCreated {
            pool_id,
            sponsor: pool.sponsor,
            name,
            total_funding,
            allocation_per_user,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn add_beneficiaries(
        ctx: Context<AddBeneficiaries>,
        pool_id: u64,
        beneficiary: Pubkey,
        allocated_gb: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool_account;
        require!(pool.is_active, ErrorCode::PoolNotActive);
        require!(allocated_gb >= MIN_ALLOCATION_GB, ErrorCode::AllocationTooSmall);

        let max_beneficiaries = pool.total_funded.checked_div(pool.allocation_per_user).unwrap() as u32;
        require!(pool.beneficiary_count < max_beneficiaries, ErrorCode::PoolFull);

        let access = &mut ctx.accounts.beneficiary_access;
        access.pool_id = pool_id;
        access.beneficiary = beneficiary;
        access.allocated_gb = allocated_gb;
        access.used_gb = 0;
        access.last_used = 0;
        access.is_whitelisted = true;
        access.added_at = Clock::get()?.unix_timestamp;

        pool.beneficiary_count = pool.beneficiary_count.checked_add(1).unwrap();

        emit!(BeneficiaryAdded {
            pool_id,
            beneficiary,
            allocated_gb,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn remove_beneficiary(
        ctx: Context<RemoveBeneficiary>,
        pool_id: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool_account;
        let access = &mut ctx.accounts.beneficiary_access;
        
        require!(access.is_whitelisted, ErrorCode::BeneficiaryNotWhitelisted);

        access.is_whitelisted = false;
        pool.beneficiary_count = pool.beneficiary_count.checked_sub(1).unwrap();

        emit!(BeneficiaryRemoved {
            pool_id,
            beneficiary: access.beneficiary,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn fund_pool(
        ctx: Context<FundPool>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidFunding);

        let pool = &mut ctx.accounts.pool_account;
        require!(pool.is_active, ErrorCode::PoolNotActive);

        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.sponsor_token_account.to_account_info(),
                to: ctx.accounts.pool_vault.to_account_info(),
                authority: ctx.accounts.sponsor.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, amount)?;

        pool.total_funded = pool.total_funded.checked_add(amount).unwrap();

        emit!(PoolFunded {
            pool_id: pool.pool_id,
            sponsor: pool.sponsor,
            amount,
            new_balance: pool.total_funded.checked_sub(pool.total_used).unwrap(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn redeem_access(
        ctx: Context<RedeemAccess>,
        bandwidth_gb: u64,
    ) -> Result<()> {
        let pool = &ctx.accounts.pool_account;
        let access = &mut ctx.accounts.beneficiary_access;
        
        require!(pool.is_active, ErrorCode::PoolNotActive);
        require!(access.is_whitelisted, ErrorCode::BeneficiaryNotWhitelisted);
        require!(bandwidth_gb > 0, ErrorCode::InvalidBandwidth);

        let remaining = access.allocated_gb.checked_sub(access.used_gb).unwrap();
        require!(remaining >= bandwidth_gb, ErrorCode::InsufficientAllocation);

        let pool_remaining = pool.total_funded.checked_sub(pool.total_used).unwrap();
        require!(pool_remaining >= bandwidth_gb, ErrorCode::InsufficientPoolBalance);

        access.used_gb = access.used_gb.checked_add(bandwidth_gb).unwrap();
        access.last_used = Clock::get()?.unix_timestamp;

        let pool = &mut ctx.accounts.pool_account;
        pool.total_used = pool.total_used.checked_add(bandwidth_gb).unwrap();

        if pool.auto_refill_enabled {
            let remaining_balance = pool.total_funded.checked_sub(pool.total_used).unwrap();
            if remaining_balance < pool.auto_refill_threshold {
                emit!(AutoRefillTriggered {
                    pool_id: pool.pool_id,
                    remaining_balance,
                    threshold: pool.auto_refill_threshold,
                    timestamp: Clock::get()?.unix_timestamp,
                });
            }
        }

        emit!(AccessRedeemed {
            pool_id: pool.pool_id,
            beneficiary: access.beneficiary,
            bandwidth_gb,
            remaining_allocation: access.allocated_gb.checked_sub(access.used_gb).unwrap(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn close_pool(ctx: Context<ClosePool>) -> Result<()> {
        let pool = &mut ctx.accounts.pool_account;
        require!(pool.is_active, ErrorCode::PoolNotActive);

        let remaining = pool.total_funded.checked_sub(pool.total_used).unwrap();

        if remaining > 0 {
            let pool_id_bytes = pool.pool_id.to_le_bytes();
            let sponsor_key = pool.sponsor.key();
            let bump = ctx.bumps.pool_vault;
            
            let signer_seeds: &[&[&[u8]]] = &[&[
                b"pool_vault",
                sponsor_key.as_ref(),
                pool_id_bytes.as_ref(),
                &[bump],
            ]];

            let transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.pool_vault.to_account_info(),
                    to: ctx.accounts.sponsor_token_account.to_account_info(),
                    authority: ctx.accounts.pool_vault.to_account_info(),
                },
                signer_seeds,
            );
            token::transfer(transfer_ctx, remaining)?;
        }

        pool.is_active = false;

        emit!(PoolClosed {
            pool_id: pool.pool_id,
            sponsor: pool.sponsor,
            refunded_amount: remaining,
            total_used: pool.total_used,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn update_auto_refill(
        ctx: Context<UpdateAutoRefill>,
        enabled: bool,
        threshold: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool_account;
        require!(pool.is_active, ErrorCode::PoolNotActive);

        pool.auto_refill_enabled = enabled;
        pool.auto_refill_threshold = threshold;

        emit!(AutoRefillUpdated {
            pool_id: pool.pool_id,
            enabled,
            threshold,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn extend_allocation(
        ctx: Context<ExtendAllocation>,
        additional_gb: u64,
    ) -> Result<()> {
        let access = &mut ctx.accounts.beneficiary_access;
        require!(access.is_whitelisted, ErrorCode::BeneficiaryNotWhitelisted);
        require!(additional_gb > 0, ErrorCode::InvalidBandwidth);

        access.allocated_gb = access.allocated_gb.checked_add(additional_gb).unwrap();

        emit!(AllocationExtended {
            pool_id: access.pool_id,
            beneficiary: access.beneficiary,
            additional_gb,
            new_allocation: access.allocated_gb,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(pool_id: u64)]
pub struct CreatePool<'info> {
    #[account(
        init,
        payer = sponsor,
        space = 8 + PoolAccount::LEN,
        seeds = [b"pool", sponsor.key().as_ref(), pool_id.to_le_bytes().as_ref()],
        bump
    )]
    pub pool_account: Account<'info, PoolAccount>,
    
    #[account(
        init,
        payer = sponsor,
        token::mint = token_mint,
        token::authority = pool_vault,
        seeds = [b"pool_vault", sponsor.key().as_ref(), pool_id.to_le_bytes().as_ref()],
        bump
    )]
    pub pool_vault: Account<'info, TokenAccount>,
    
    pub token_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub sponsor_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub sponsor: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(pool_id: u64)]
pub struct AddBeneficiaries<'info> {
    #[account(
        mut,
        seeds = [b"pool", sponsor.key().as_ref(), pool_id.to_le_bytes().as_ref()],
        bump,
        has_one = sponsor
    )]
    pub pool_account: Account<'info, PoolAccount>,
    
    #[account(
        init,
        payer = sponsor,
        space = 8 + BeneficiaryAccess::LEN,
        seeds = [b"access", pool_id.to_le_bytes().as_ref(), beneficiary_key.as_ref()],
        bump
    )]
    pub beneficiary_access: Account<'info, BeneficiaryAccess>,
    
    /// CHECK: Beneficiary public key
    pub beneficiary_key: AccountInfo<'info>,
    
    #[account(mut)]
    pub sponsor: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(pool_id: u64)]
pub struct RemoveBeneficiary<'info> {
    #[account(
        mut,
        seeds = [b"pool", sponsor.key().as_ref(), pool_id.to_le_bytes().as_ref()],
        bump,
        has_one = sponsor
    )]
    pub pool_account: Account<'info, PoolAccount>,
    
    #[account(
        mut,
        seeds = [b"access", pool_id.to_le_bytes().as_ref(), beneficiary_access.beneficiary.as_ref()],
        bump
    )]
    pub beneficiary_access: Account<'info, BeneficiaryAccess>,
    
    pub sponsor: Signer<'info>,
}

#[derive(Accounts)]
pub struct FundPool<'info> {
    #[account(
        mut,
        seeds = [b"pool", sponsor.key().as_ref(), pool_account.pool_id.to_le_bytes().as_ref()],
        bump,
        has_one = sponsor
    )]
    pub pool_account: Account<'info, PoolAccount>,
    
    #[account(
        mut,
        seeds = [b"pool_vault", sponsor.key().as_ref(), pool_account.pool_id.to_le_bytes().as_ref()],
        bump
    )]
    pub pool_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub sponsor_token_account: Account<'info, TokenAccount>,
    
    pub sponsor: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RedeemAccess<'info> {
    #[account(
        mut,
        seeds = [b"pool", pool_account.sponsor.as_ref(), pool_account.pool_id.to_le_bytes().as_ref()],
        bump
    )]
    pub pool_account: Account<'info, PoolAccount>,
    
    #[account(
        mut,
        seeds = [b"access", pool_account.pool_id.to_le_bytes().as_ref(), beneficiary.key().as_ref()],
        bump,
        has_one = beneficiary
    )]
    pub beneficiary_access: Account<'info, BeneficiaryAccess>,
    
    pub beneficiary: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClosePool<'info> {
    #[account(
        mut,
        seeds = [b"pool", sponsor.key().as_ref(), pool_account.pool_id.to_le_bytes().as_ref()],
        bump,
        has_one = sponsor
    )]
    pub pool_account: Account<'info, PoolAccount>,
    
    #[account(
        mut,
        seeds = [b"pool_vault", sponsor.key().as_ref(), pool_account.pool_id.to_le_bytes().as_ref()],
        bump
    )]
    pub pool_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub sponsor_token_account: Account<'info, TokenAccount>,
    
    pub sponsor: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateAutoRefill<'info> {
    #[account(
        mut,
        seeds = [b"pool", sponsor.key().as_ref(), pool_account.pool_id.to_le_bytes().as_ref()],
        bump,
        has_one = sponsor
    )]
    pub pool_account: Account<'info, PoolAccount>,
    
    pub sponsor: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExtendAllocation<'info> {
    #[account(
        seeds = [b"pool", sponsor.key().as_ref(), pool_account.pool_id.to_le_bytes().as_ref()],
        bump,
        has_one = sponsor
    )]
    pub pool_account: Account<'info, PoolAccount>,
    
    #[account(
        mut,
        seeds = [b"access", pool_account.pool_id.to_le_bytes().as_ref(), beneficiary_access.beneficiary.as_ref()],
        bump
    )]
    pub beneficiary_access: Account<'info, BeneficiaryAccess>,
    
    pub sponsor: Signer<'info>,
}

#[account]
pub struct PoolAccount {
    pub sponsor: Pubkey,
    pub pool_id: u64,
    pub name: String,
    pub token_mint: Pubkey,
    pub total_funded: u64,
    pub total_used: u64,
    pub beneficiary_count: u32,
    pub allocation_per_user: u64,
    pub is_active: bool,
    pub created_at: i64,
    pub auto_refill_threshold: u64,
    pub auto_refill_enabled: bool,
}

impl PoolAccount {
    pub const LEN: usize = 32 + 8 + (4 + MAX_POOL_NAME_LEN) + 32 + 8 + 8 + 4 + 8 + 1 + 8 + 8 + 1;
}

#[account]
pub struct BeneficiaryAccess {
    pub pool_id: u64,
    pub beneficiary: Pubkey,
    pub allocated_gb: u64,
    pub used_gb: u64,
    pub last_used: i64,
    pub is_whitelisted: bool,
    pub added_at: i64,
}

impl BeneficiaryAccess {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 8 + 1 + 8;
}

#[event]
pub struct PoolCreated {
    pub pool_id: u64,
    pub sponsor: Pubkey,
    pub name: String,
    pub total_funding: u64,
    pub allocation_per_user: u64,
    pub timestamp: i64,
}

#[event]
pub struct BeneficiaryAdded {
    pub pool_id: u64,
    pub beneficiary: Pubkey,
    pub allocated_gb: u64,
    pub timestamp: i64,
}

#[event]
pub struct BeneficiaryRemoved {
    pub pool_id: u64,
    pub beneficiary: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PoolFunded {
    pub pool_id: u64,
    pub sponsor: Pubkey,
    pub amount: u64,
    pub new_balance: u64,
    pub timestamp: i64,
}

#[event]
pub struct AccessRedeemed {
    pub pool_id: u64,
    pub beneficiary: Pubkey,
    pub bandwidth_gb: u64,
    pub remaining_allocation: u64,
    pub timestamp: i64,
}

#[event]
pub struct PoolClosed {
    pub pool_id: u64,
    pub sponsor: Pubkey,
    pub refunded_amount: u64,
    pub total_used: u64,
    pub timestamp: i64,
}

#[event]
pub struct AutoRefillTriggered {
    pub pool_id: u64,
    pub remaining_balance: u64,
    pub threshold: u64,
    pub timestamp: i64,
}

#[event]
pub struct AutoRefillUpdated {
    pub pool_id: u64,
    pub enabled: bool,
    pub threshold: u64,
    pub timestamp: i64,
}

#[event]
pub struct AllocationExtended {
    pub pool_id: u64,
    pub beneficiary: Pubkey,
    pub additional_gb: u64,
    pub new_allocation: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Pool name exceeds maximum length of 128 characters")]
    PoolNameTooLong,
    #[msg("Funding amount must be greater than 0")]
    InvalidFunding,
    #[msg("Allocation per user must be at least 1GB")]
    AllocationTooSmall,
    #[msg("Pool is not active")]
    PoolNotActive,
    #[msg("Pool has reached maximum beneficiary capacity")]
    PoolFull,
    #[msg("Beneficiary is not whitelisted for this pool")]
    BeneficiaryNotWhitelisted,
    #[msg("Bandwidth amount must be greater than 0")]
    InvalidBandwidth,
    #[msg("Insufficient allocation remaining for beneficiary")]
    InsufficientAllocation,
    #[msg("Insufficient balance remaining in pool")]
    InsufficientPoolBalance,
}
