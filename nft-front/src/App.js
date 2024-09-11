import { ConnectionProvider, WalletProvider, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { SalmonWalletAdapter } from '@solana/wallet-adapter-wallets';
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import React, { useMemo, useCallback, useState } from 'react';
import { Program, AnchorProvider, web3, utils } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import idl from './nftminter.json';
require('@solana/wallet-adapter-react-ui/styles.css');
require('./App.css');

const App = () => {
    return (
        <Context>
            <Content />
        </Context>
    );
};
export default App;

const Context = ({ children }) => {
    const customClusterEndpoint = "https://staging-rpc.dev2.eclipsenetwork.xyz";
    const endpoint = customClusterEndpoint;
    const wallets = useMemo(() => [new SalmonWalletAdapter()], []);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

const Content = () => {
    const wallet = useWallet();
    const anchorWallet = useAnchorWallet();
    const [nftName, setNftName] = useState('');
    const [nftSymbol, setNftSymbol] = useState('');
    const [nftImageUrl, setNftImageUrl] = useState('');
    const [discordUsername, setDiscordUsername] = useState('');

    const onMintNFT = useCallback(async () => {
        if (!anchorWallet) return;
        const connection = new Connection("https://staging-rpc.dev2.eclipsenetwork.xyz", 'confirmed');
        const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
        const programId = new PublicKey('8bhThreQ94VxP4HY92BGu4TZoPMan1zfKsdP4bS1tCbV');
        
        try {
            const program = new Program(idl, programId, provider);

            const mintKeypair = web3.Keypair.generate();
            const tokenMetadataProgramId = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

            const [metadataAddress] = await PublicKey.findProgramAddressSync(
                [Buffer.from("metadata"), tokenMetadataProgramId.toBuffer(), mintKeypair.publicKey.toBuffer()],
                tokenMetadataProgramId
            );

            const tokenAddress = await utils.token.associatedAddress({
                mint: mintKeypair.publicKey,
                owner: anchorWallet.publicKey
            });

            const [discordInfoAddress] = await PublicKey.findProgramAddressSync(
                [Buffer.from("discord_info"), mintKeypair.publicKey.toBuffer()],
                programId
            );

            const tx = await program.methods.mintNftWithDiscord(nftName, nftSymbol, nftImageUrl, discordUsername)
                .accounts({
                    mint: mintKeypair.publicKey,
                    tokenAccount: tokenAddress,
                    metadata: metadataAddress,
                    payer: anchorWallet.publicKey,
                    discordInfo: discordInfoAddress,
                    rent: SYSVAR_RENT_PUBKEY,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    tokenMetadataProgram: tokenMetadataProgramId,
                })
                .signers([mintKeypair])
                .transaction();

            const txSignature = await wallet.sendTransaction(tx, connection);
            await connection.confirmTransaction(txSignature, 'confirmed');

            alert("NFT minted successfully with Discord username: " + discordUsername);
        } catch (error) {
            console.error("Detailed error:", error);
            alert("Error minting NFT: " + error.message);
        }
    }, [anchorWallet, wallet, nftName, nftSymbol, nftImageUrl, discordUsername]);

    return (
        <div className="App">
            <header className="title-header">
                Eclipse Devnet NFT Minter
            </header>
            <img src={"/eclipse-logo.jpg"} alt="Logo" className="logo" />
            <WalletMultiButton className="WalletMultiButton" />
            <div>
                <input type="text" placeholder="NFT Name" value={nftName} onChange={(e) => setNftName(e.target.value)} />
                <input type="text" placeholder="NFT Symbol" value={nftSymbol} onChange={(e) => setNftSymbol(e.target.value)} />
                <input type="text" placeholder="NFT Image URL" value={nftImageUrl} onChange={(e) => setNftImageUrl(e.target.value)} />
                <input type="text" placeholder="Discord Username" value={discordUsername} onChange={(e) => setDiscordUsername(e.target.value)} />
                <button onClick={onMintNFT} disabled={!wallet.connected || !nftName || !nftSymbol || !nftImageUrl || !discordUsername}>
                    Mint NFT
                </button>
            </div>
        </div>
    );
};