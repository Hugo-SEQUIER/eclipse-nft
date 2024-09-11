import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { SalmonWalletAdapter } from '@solana/wallet-adapter-wallets';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import {  useMemo, useCallback, useState } from 'react';
import { Program, AnchorProvider, web3, utils } from '@project-serum/anchor';
import idl from '../nftminter.json';
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
    const [nftName, setNftName] = useState('');
    const [nftDescription, setNftDescription] = useState('');
    const [nftImageUrl, setNftImageUrl] = useState('');

    const anchorWallet = useMemo(() => {
        if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) return null;
        return {
            publicKey: wallet.publicKey,
            signTransaction: wallet.signTransaction.bind(wallet),
            signAllTransactions: wallet.signAllTransactions.bind(wallet),
        };
    }, [wallet]);

    const onMintNFT = useCallback(async () => {
        if (!anchorWallet) return;
        const connection = new Connection("https://staging-rpc.dev2.eclipsenetwork.xyz", 'confirmed');
        const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
        const programId = new PublicKey('28yv9AxVwUtw1HtDYin7JS3F3x1Z2G9cqAdowUb3iCs6');
        const program = new Program(idl, programId, provider);

        try {
            const [nftInfo] = await PublicKey.findProgramAddressSync(
                [utils.bytes.utf8.encode("nft_info"), anchorWallet.publicKey.toBuffer()],
                program.programId
            );

            await program.methods.mintNft(nftName, nftDescription, nftImageUrl).rpc();
            alert("NFT minted successfully");
        } catch (error) {
            console.error("Error minting NFT:", error);
            alert("Error minting NFT: " + error.message);
        }
    }, [anchorWallet, nftName, nftDescription, nftImageUrl]);

    return (
        <div className="App">
            <header className="title-header">
                Eclipse Devnet NFT Minter
            </header>
            <img src={"/eclipse-logo.jpg"} alt="Logo" className="logo" />
            <WalletMultiButton className="WalletMultiButton" />
            <div>
                <input type="text" placeholder="NFT Name" value={nftName} onChange={(e) => setNftName(e.target.value)} />
                <input type="text" placeholder="NFT Description" value={nftDescription} onChange={(e) => setNftDescription(e.target.value)} />
                <input type="text" placeholder="NFT Image URL" value={nftImageUrl} onChange={(e) => setNftImageUrl(e.target.value)} />
                <button onClick={onMintNFT} disabled={!wallet.connected || !nftName || !nftDescription || !nftImageUrl}>
                    Mint NFT
                </button>
            </div>
        </div>
    );
};