use anchor_lang::prelude::*;
use anchor_spl::token::{self, MintTo, Token, TokenAccount};

declare_id!("28yv9AxVwUtw1HtDYin7JS3F3x1Z2G9cqAdowUb3iCs6");

#[program]
pub mod nftminter {
    use super::*;
    pub fn mint_nft(ctx: Context<MintNft>, name: String, description: String, image_uri: String) -> Result<()> {
        let nft_info = &mut ctx.accounts.nft_info;
        nft_info.name = name;
        nft_info.description = description;
        nft_info.image_uri = image_uri;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct MintNft<'info> {
    #[account(init, payer = user, space = 1024)]
    pub nft_info: Account<'info, NftInfo>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct NftInfo {
    pub name: String,
    pub description: String,
    pub image_uri: String,
}