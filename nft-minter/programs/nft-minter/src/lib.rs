use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint};
use anchor_spl::associated_token::AssociatedToken;
use mpl_token_metadata::instructions as mpl_instruction;
use mpl_token_metadata::types::{Creator, DataV2};

declare_id!("DNxFQyTTC6k1HBHfcuGEhP28eT94aoRwjxT4o4TNbBkR");

#[program]
pub mod nft_minter {
    use super::*;

    pub fn mint_nft_with_discord(
        ctx: Context<MintNFT>,
        name: String,
        symbol: String,
        uri: String,
        discord_username: String,
    ) -> Result<()> {
        // Validate input
        require!(name.len() <= 32, NftError::NameTooLong);
        require!(symbol.len() <= 10, NftError::SymbolTooLong);
        require!(uri.len() <= 200, NftError::UriTooLong);
        require!(discord_username.len() <= 32 && discord_username.len() >= 2, NftError::InvalidDiscordUsername);

        // Create mint account
        let cpi_context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.payer.to_account_info(),
            },
        );
        token::mint_to(cpi_context, 1)?;

        // Create metadata account
        let creator = vec![Creator {
            address: ctx.accounts.payer.key(),
            verified: false,
            share: 100,
        }];

        let data = DataV2 {
            name,
            symbol,
            uri,
            seller_fee_basis_points: 0,
            creators: Some(creator),
            collection: None,
            uses: None,
        };

        let ix = mpl_instruction::CreateMetadataAccountV3 {
            metadata: ctx.accounts.metadata.key(),
            mint: ctx.accounts.mint.key(),
            mint_authority: ctx.accounts.payer.key(),
            payer: ctx.accounts.payer.key(),
            update_authority: (ctx.accounts.payer.key(), true),
            system_program: ctx.accounts.system_program.key(),
            rent: None,
        }.instruction(mpl_instruction::CreateMetadataAccountV3InstructionArgs {
            data,
            is_mutable: false,
            collection_details: None,
        });

        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.metadata.to_account_info(),
                ctx.accounts.mint.to_account_info(),
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.token_metadata_program.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
                ctx.accounts.rent.to_account_info(),
            ],
        )?;

        // Store Discord username
        ctx.accounts.discord_info.discord_username = discord_username;
        ctx.accounts.discord_info.owner = ctx.accounts.payer.key();

        Ok(())
    }
}

#[derive(Accounts)]
pub struct MintNFT<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = payer
    )]
    pub token_account: Account<'info, TokenAccount>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub token_metadata_program: UncheckedAccount<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 32, // Discriminator + Pubkey + Discord username (max 32 chars)
        seeds = [b"discord_info", mint.key().as_ref()],
        bump
    )]
    pub discord_info: Account<'info, DiscordInfo>,
}

#[account]
pub struct DiscordInfo {
    pub owner: Pubkey,
    pub discord_username: String,
}

#[error_code]
pub enum NftError {
    #[msg("Name is too long")]
    NameTooLong,
    #[msg("Symbol is too long")]
    SymbolTooLong,
    #[msg("URI is too long")]
    UriTooLong,
    #[msg("Invalid Discord username")]
    InvalidDiscordUsername,
}