use anchor_lang::prelude::*;

declare_id!("84nGazRaquGTNsHMkcF7Zi4T6UzGverZ5ixLRJHtFLbg");

#[program]
pub mod nft_minter {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
















