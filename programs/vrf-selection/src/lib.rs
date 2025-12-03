use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar;

declare_id!("4SD36sZLcudbMwUqpd9Efp2iBrN5ihMWj8d59aFAoQFT");

#[program]
pub mod vrf_node_selection {
    use super::*;

    pub fn request_random_node(
        ctx: Context<RequestRandomNode>,
        user_seed: [u8; 32],
    ) -> Result<()> {
        let request = &mut ctx.accounts.vrf_request;
        let clock = Clock::get()?;
        
        request.user = ctx.accounts.user.key();
        request.seed = user_seed;
        request.timestamp = clock.unix_timestamp;
        request.is_fulfilled = false;
        request.selected_node = None;

        emit!(VrfRequested {
            user: request.user,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn fulfill_random_selection(
        ctx: Context<FulfillRandomSelection>,
        vrf_result: [u8; 32],
        node_pool: Vec<Pubkey>,
        reputation_weights: Vec<u8>,
    ) -> Result<()> {
        require!(node_pool.len() == reputation_weights.len(), ErrorCode::MismatchedLengths);
        require!(!node_pool.is_empty(), ErrorCode::EmptyNodePool);

        let request = &mut ctx.accounts.vrf_request;
        require!(!request.is_fulfilled, ErrorCode::AlreadyFulfilled);

        let random_value = u64::from_le_bytes([
            vrf_result[0],
            vrf_result[1],
            vrf_result[2],
            vrf_result[3],
            vrf_result[4],
            vrf_result[5],
            vrf_result[6],
            vrf_result[7],
        ]);

        let selected_node = select_weighted_node(
            random_value,
            &node_pool,
            &reputation_weights,
        )?;

        request.selected_node = Some(selected_node);
        request.is_fulfilled = true;

        emit!(NodeSelected {
            user: request.user,
            selected_node,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn get_selected_node(ctx: Context<GetSelectedNode>) -> Result<Option<Pubkey>> {
        let request = &ctx.accounts.vrf_request;
        Ok(request.selected_node)
    }
}

fn select_weighted_node(
    random_value: u64,
    nodes: &[Pubkey],
    weights: &[u8],
) -> Result<Pubkey> {
    let total_weight: u64 = weights.iter().map(|&w| w as u64).sum();
    require!(total_weight > 0, ErrorCode::ZeroTotalWeight);

    let target = random_value % total_weight;
    let mut cumulative = 0u64;

    for (i, &weight) in weights.iter().enumerate() {
        cumulative = cumulative.checked_add(weight as u64).unwrap();
        if target < cumulative {
            return Ok(nodes[i]);
        }
    }

    Ok(nodes[nodes.len() - 1])
}

#[derive(Accounts)]
pub struct RequestRandomNode<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + VrfRequest::LEN,
        seeds = [b"vrf_request", user.key().as_ref()],
        bump
    )]
    pub vrf_request: Account<'info, VrfRequest>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FulfillRandomSelection<'info> {
    #[account(
        mut,
        seeds = [b"vrf_request", vrf_request.user.as_ref()],
        bump
    )]
    pub vrf_request: Account<'info, VrfRequest>,
    
    /// CHECK: VRF authority
    pub vrf_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct GetSelectedNode<'info> {
    #[account(
        seeds = [b"vrf_request", vrf_request.user.as_ref()],
        bump
    )]
    pub vrf_request: Account<'info, VrfRequest>,
}

#[account]
pub struct VrfRequest {
    pub user: Pubkey,
    pub seed: [u8; 32],
    pub timestamp: i64,
    pub is_fulfilled: bool,
    pub selected_node: Option<Pubkey>,
}

impl VrfRequest {
    pub const LEN: usize = 32 + 32 + 8 + 1 + (1 + 32);
}

#[event]
pub struct VrfRequested {
    pub user: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct NodeSelected {
    pub user: Pubkey,
    pub selected_node: Pubkey,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Node pool and reputation weights have mismatched lengths")]
    MismatchedLengths,
    #[msg("Node pool cannot be empty")]
    EmptyNodePool,
    #[msg("VRF request already fulfilled")]
    AlreadyFulfilled,
    #[msg("Total weight cannot be zero")]
    ZeroTotalWeight,
}
