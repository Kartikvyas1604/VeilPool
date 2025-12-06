use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("786JcBvwFVwZNJfatLkUzuByuvqzMKQgD3Aw8NrPChhH");

const BASE_PRICE_PER_GB_USDC: u64 = 500_000;
const DEFAULT_EXPIRY_DAYS: i64 = 30;
const TIER_1_THRESHOLD_GB: u64 = 100;
const TIER_1_DISCOUNT_BPS: u16 = 500;
const TIER_2_THRESHOLD_GB: u64 = 1000;
const TIER_2_DISCOUNT_BPS: u16 = 1500;

#[program]
pub mod privacy_pass {
    use super::*;

    pub fn initialize_pass_system(
        ctx: Context<InitializePassSystem>,
        price_oracle: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.pricing_config;
        
        config.authority = ctx.accounts.authority.key();
        config.base_price_per_gb = BASE_PRICE_PER_GB_USDC;
        config.price_oracle = price_oracle;
        config.pass_mint = ctx.accounts.pass_mint.key();
        config.treasury = ctx.accounts.treasury.key();
        config.total_passes_sold = 0;
        config.total_revenue = 0;
        config.tier_1_threshold = TIER_1_THRESHOLD_GB;
        config.tier_1_discount = TIER_1_DISCOUNT_BPS;
        config.tier_2_threshold = TIER_2_THRESHOLD_GB;
        config.tier_2_discount = TIER_2_DISCOUNT_BPS;
        config.is_active = true;

        emit!(PassSystemInitialized {
            authority: config.authority,
            base_price: config.base_price_per_gb,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn purchase_pass(
        ctx: Context<PurchasePass>,
        bandwidth_gb: u64,
    ) -> Result<()> {
        let config = &ctx.accounts.pricing_config;
        require!(config.is_active, ErrorCode::SystemNotActive);
        require!(bandwidth_gb > 0, ErrorCode::InvalidBandwidth);

        let price = calculate_price(bandwidth_gb, config)?;

        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, price)?;

        let pass = &mut ctx.accounts.pass_account;
        let clock = Clock::get()?;
        
        pass.user = ctx.accounts.user.key();
        pass.remaining_gb = bandwidth_gb;
        pass.expiry_timestamp = clock.unix_timestamp
            .checked_add(DEFAULT_EXPIRY_DAYS.checked_mul(86400).unwrap())
            .unwrap();
        pass.pool_id = None;
        pass.purchased_at = clock.unix_timestamp;
        pass.total_spent = price;
        pass.pass_type = PassType::PayPerGb;
        pass.is_active = true;

        let config = &mut ctx.accounts.pricing_config;
        config.total_passes_sold = config.total_passes_sold.checked_add(1).unwrap();
        config.total_revenue = config.total_revenue.checked_add(price).unwrap();

        emit!(PassPurchased {
            user: pass.user,
            bandwidth_gb,
            price_paid: price,
            expiry: pass.expiry_timestamp,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn purchase_subscription(
        ctx: Context<PurchasePass>,
        subscription_type: SubscriptionType,
    ) -> Result<()> {
        let config = &ctx.accounts.pricing_config;
        require!(config.is_active, ErrorCode::SystemNotActive);

        let (bandwidth_gb, price, duration_days) = match subscription_type {
            SubscriptionType::Monthly => (500, 200_000_000, 30),
            SubscriptionType::Quarterly => (1500, 540_000_000, 90),
            SubscriptionType::Yearly => (6000, 1920_000_000, 365),
        };

        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, price)?;

        let pass = &mut ctx.accounts.pass_account;
        let clock = Clock::get()?;
        
        pass.user = ctx.accounts.user.key();
        pass.remaining_gb = bandwidth_gb;
        pass.expiry_timestamp = clock.unix_timestamp
            .checked_add((duration_days as i64).checked_mul(86400).unwrap())
            .unwrap();
        pass.pool_id = None;
        pass.purchased_at = clock.unix_timestamp;
        pass.total_spent = price;
        pass.pass_type = PassType::Subscription;
        pass.is_active = true;

        let config = &mut ctx.accounts.pricing_config;
        config.total_passes_sold = config.total_passes_sold.checked_add(1).unwrap();
        config.total_revenue = config.total_revenue.checked_add(price).unwrap();

        emit!(SubscriptionPurchased {
            user: pass.user,
            subscription_type,
            bandwidth_gb,
            price_paid: price,
            expiry: pass.expiry_timestamp,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn create_pool_pass(
        ctx: Context<CreatePoolPass>,
        pool_id: u64,
        allocated_gb: u64,
    ) -> Result<()> {
        require!(allocated_gb > 0, ErrorCode::InvalidBandwidth);

        let pass = &mut ctx.accounts.pass_account;
        let clock = Clock::get()?;
        
        pass.user = ctx.accounts.beneficiary.key();
        pass.remaining_gb = allocated_gb;
        pass.expiry_timestamp = clock.unix_timestamp
            .checked_add((365 as i64).checked_mul(86400).unwrap())
            .unwrap();
        pass.pool_id = Some(pool_id);
        pass.purchased_at = clock.unix_timestamp;
        pass.total_spent = 0;
        pass.pass_type = PassType::PoolSponsored;
        pass.is_active = true;

        emit!(PoolPassCreated {
            user: pass.user,
            pool_id,
            allocated_gb,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn redeem_pass(
        ctx: Context<RedeemPass>,
        bandwidth_gb: u64,
        node_operator: Pubkey,
    ) -> Result<()> {
        let pass = &mut ctx.accounts.pass_account;
        let clock = Clock::get()?;
        
        require!(pass.is_active, ErrorCode::PassNotActive);
        require!(clock.unix_timestamp <= pass.expiry_timestamp, ErrorCode::PassExpired);
        require!(bandwidth_gb > 0, ErrorCode::InvalidBandwidth);
        require!(pass.remaining_gb >= bandwidth_gb, ErrorCode::InsufficientBalance);

        pass.remaining_gb = pass.remaining_gb.checked_sub(bandwidth_gb).unwrap();

        if pass.remaining_gb == 0 {
            pass.is_active = false;
        }

        emit!(PassRedeemed {
            user: pass.user,
            node_operator,
            bandwidth_gb,
            remaining_gb: pass.remaining_gb,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn extend_expiry(
        ctx: Context<ExtendExpiry>,
        additional_days: u16,
    ) -> Result<()> {
        require!(additional_days > 0, ErrorCode::InvalidDuration);

        let pass = &mut ctx.accounts.pass_account;
        require!(pass.is_active, ErrorCode::PassNotActive);

        let price = ctx.accounts.pricing_config.base_price_per_gb
            .checked_mul(additional_days as u64)
            .unwrap()
            .checked_div(30).unwrap();

        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, price)?;

        pass.expiry_timestamp = pass.expiry_timestamp
            .checked_add((additional_days as i64).checked_mul(86400).unwrap())
            .unwrap();
        pass.total_spent = pass.total_spent.checked_add(price).unwrap();

        emit!(PassExtended {
            user: pass.user,
            additional_days,
            new_expiry: pass.expiry_timestamp,
            price_paid: price,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn top_up_pass(
        ctx: Context<TopUpPass>,
        additional_gb: u64,
    ) -> Result<()> {
        require!(additional_gb > 0, ErrorCode::InvalidBandwidth);

        let pass = &mut ctx.accounts.pass_account;
        require!(pass.is_active, ErrorCode::PassNotActive);

        let config = &ctx.accounts.pricing_config;
        let price = calculate_price(additional_gb, config)?;

        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, price)?;

        pass.remaining_gb = pass.remaining_gb.checked_add(additional_gb).unwrap();
        pass.total_spent = pass.total_spent.checked_add(price).unwrap();

        let config = &mut ctx.accounts.pricing_config;
        config.total_revenue = config.total_revenue.checked_add(price).unwrap();

        emit!(PassToppedUp {
            user: pass.user,
            additional_gb,
            new_balance: pass.remaining_gb,
            price_paid: price,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn validate_pass(
        ctx: Context<ValidatePass>,
        required_gb: u64,
    ) -> Result<bool> {
        let pass = &ctx.accounts.pass_account;
        let clock = Clock::get()?;
        
        let is_valid = pass.is_active
            && clock.unix_timestamp <= pass.expiry_timestamp
            && pass.remaining_gb >= required_gb;

        emit!(PassValidated {
            user: pass.user,
            required_gb,
            is_valid,
            timestamp: clock.unix_timestamp,
        });

        Ok(is_valid)
    }

    pub fn deactivate_pass(ctx: Context<DeactivatePass>) -> Result<()> {
        let pass = &mut ctx.accounts.pass_account;
        require!(pass.is_active, ErrorCode::PassNotActive);

        pass.is_active = false;

        emit!(PassDeactivated {
            user: pass.user,
            remaining_gb: pass.remaining_gb,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn update_pricing(
        ctx: Context<UpdatePricing>,
        new_base_price: u64,
    ) -> Result<()> {
        require!(new_base_price > 0, ErrorCode::InvalidPrice);

        let config = &mut ctx.accounts.pricing_config;
        let old_price = config.base_price_per_gb;
        config.base_price_per_gb = new_base_price;

        emit!(PricingUpdated {
            old_price,
            new_price: new_base_price,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

fn calculate_price(bandwidth_gb: u64, config: &PricingConfig) -> Result<u64> {
    let base_price = bandwidth_gb.checked_mul(config.base_price_per_gb).unwrap();
    
    let discount_bps = if bandwidth_gb >= config.tier_2_threshold {
        config.tier_2_discount
    } else if bandwidth_gb >= config.tier_1_threshold {
        config.tier_1_discount
    } else {
        0
    };

    let discount = base_price
        .checked_mul(discount_bps as u64).unwrap()
        .checked_div(10000).unwrap();
    
    Ok(base_price.checked_sub(discount).unwrap())
}

#[derive(Accounts)]
pub struct InitializePassSystem<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + PricingConfig::LEN,
        seeds = [b"pricing_config"],
        bump
    )]
    pub pricing_config: Account<'info, PricingConfig>,
    
    pub pass_mint: Account<'info, Mint>,
    
    /// CHECK: Treasury wallet
    pub treasury: AccountInfo<'info>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PurchasePass<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + PassAccount::LEN,
        seeds = [b"pass", user.key().as_ref()],
        bump
    )]
    pub pass_account: Account<'info, PassAccount>,
    
    #[account(
        mut,
        seeds = [b"pricing_config"],
        bump
    )]
    pub pricing_config: Account<'info, PricingConfig>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(pool_id: u64)]
pub struct CreatePoolPass<'info> {
    #[account(
        init,
        payer = pool_authority,
        space = 8 + PassAccount::LEN,
        seeds = [b"pool_pass", beneficiary.key().as_ref(), pool_id.to_le_bytes().as_ref()],
        bump
    )]
    pub pass_account: Account<'info, PassAccount>,
    
    /// CHECK: Beneficiary public key
    pub beneficiary: AccountInfo<'info>,
    
    #[account(mut)]
    pub pool_authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RedeemPass<'info> {
    #[account(
        mut,
        seeds = [b"pass", user.key().as_ref()],
        bump,
        has_one = user
    )]
    pub pass_account: Account<'info, PassAccount>,
    
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExtendExpiry<'info> {
    #[account(
        mut,
        seeds = [b"pass", user.key().as_ref()],
        bump,
        has_one = user
    )]
    pub pass_account: Account<'info, PassAccount>,
    
    #[account(
        seeds = [b"pricing_config"],
        bump
    )]
    pub pricing_config: Account<'info, PricingConfig>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,
    
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct TopUpPass<'info> {
    #[account(
        mut,
        seeds = [b"pass", user.key().as_ref()],
        bump,
        has_one = user
    )]
    pub pass_account: Account<'info, PassAccount>,
    
    #[account(
        mut,
        seeds = [b"pricing_config"],
        bump
    )]
    pub pricing_config: Account<'info, PricingConfig>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,
    
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ValidatePass<'info> {
    #[account(
        seeds = [b"pass", pass_account.user.as_ref()],
        bump
    )]
    pub pass_account: Account<'info, PassAccount>,
}

#[derive(Accounts)]
pub struct DeactivatePass<'info> {
    #[account(
        mut,
        seeds = [b"pass", user.key().as_ref()],
        bump,
        has_one = user
    )]
    pub pass_account: Account<'info, PassAccount>,
    
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdatePricing<'info> {
    #[account(
        mut,
        seeds = [b"pricing_config"],
        bump,
        has_one = authority
    )]
    pub pricing_config: Account<'info, PricingConfig>,
    
    pub authority: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct PricingConfig {
    pub authority: Pubkey,
    pub base_price_per_gb: u64,
    pub price_oracle: Pubkey,
    pub pass_mint: Pubkey,
    pub treasury: Pubkey,
    pub total_passes_sold: u64,
    pub total_revenue: u64,
    pub tier_1_threshold: u64,
    pub tier_1_discount: u16,
    pub tier_2_threshold: u64,
    pub tier_2_discount: u16,
    pub is_active: bool,
}

impl PricingConfig {
    #[allow(clippy::arithmetic_side_effects)]
    pub const LEN: usize = 32 + 8 + 32 + 32 + 32 + 8 + 8 + 8 + 2 + 8 + 2 + 1;
}

#[account]
#[derive(InitSpace)]
pub struct PassAccount {
    pub user: Pubkey,
    pub remaining_gb: u64,
    pub expiry_timestamp: i64,
    pub pool_id: Option<u64>,
    pub purchased_at: i64,
    pub total_spent: u64,
    pub pass_type: PassType,
    pub is_active: bool,
}

impl PassAccount {
    #[allow(clippy::arithmetic_side_effects)]
    pub const LEN: usize = 32 + 8 + 8 + (1 + 8) + 8 + 8 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PassType {
    PayPerGb,
    Subscription,
    PoolSponsored,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum SubscriptionType {
    Monthly,
    Quarterly,
    Yearly,
}

#[event]
pub struct PassSystemInitialized {
    pub authority: Pubkey,
    pub base_price: u64,
    pub timestamp: i64,
}

#[event]
pub struct PassPurchased {
    pub user: Pubkey,
    pub bandwidth_gb: u64,
    pub price_paid: u64,
    pub expiry: i64,
    pub timestamp: i64,
}

#[event]
pub struct SubscriptionPurchased {
    pub user: Pubkey,
    pub subscription_type: SubscriptionType,
    pub bandwidth_gb: u64,
    pub price_paid: u64,
    pub expiry: i64,
    pub timestamp: i64,
}

#[event]
pub struct PoolPassCreated {
    pub user: Pubkey,
    pub pool_id: u64,
    pub allocated_gb: u64,
    pub timestamp: i64,
}

#[event]
pub struct PassRedeemed {
    pub user: Pubkey,
    pub node_operator: Pubkey,
    pub bandwidth_gb: u64,
    pub remaining_gb: u64,
    pub timestamp: i64,
}

#[event]
pub struct PassExtended {
    pub user: Pubkey,
    pub additional_days: u16,
    pub new_expiry: i64,
    pub price_paid: u64,
    pub timestamp: i64,
}

#[event]
pub struct PassToppedUp {
    pub user: Pubkey,
    pub additional_gb: u64,
    pub new_balance: u64,
    pub price_paid: u64,
    pub timestamp: i64,
}

#[event]
pub struct PassValidated {
    pub user: Pubkey,
    pub required_gb: u64,
    pub is_valid: bool,
    pub timestamp: i64,
}

#[event]
pub struct PassDeactivated {
    pub user: Pubkey,
    pub remaining_gb: u64,
    pub timestamp: i64,
}

#[event]
pub struct PricingUpdated {
    pub old_price: u64,
    pub new_price: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Pass system is not currently active")]
    SystemNotActive,
    #[msg("Invalid bandwidth amount. Must be greater than 0")]
    InvalidBandwidth,
    #[msg("Privacy pass is not active")]
    PassNotActive,
    #[msg("Privacy pass has expired")]
    PassExpired,
    #[msg("Insufficient balance remaining on pass")]
    InsufficientBalance,
    #[msg("Invalid duration. Must be greater than 0")]
    InvalidDuration,
    #[msg("Invalid price. Must be greater than 0")]
    InvalidPrice,
}
