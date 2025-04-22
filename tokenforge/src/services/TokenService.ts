import { Connection, Transaction, SystemProgram, TransactionSignature, PublicKey, Keypair } from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  createInitializeMintInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction
} from '@solana/spl-token';
import { Metaplex, keypairIdentity, toMetaplexFile } from '@metaplex-foundation/js';
import { sleep } from './utils';

// ... existing code for TokenConfig and other utility functions ...

interface TokenConfig {
  name: string;
  symbol: string;
  description: string;
  decimals: number;
  totalSupply: number;
  socialLinks: {
    website?: string;
    twitter?: string;
    telegram?: string;
    discord?: string;
  };
  creatorInfo?: {
    name: string;
    website?: string;
  };
}

export const createTokenWithMetadata = async (wallet: any, config: TokenConfig) => {
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  // Debug logging
  console.log("Connected wallet public key:", wallet.publicKey.toString());
  
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Wallet Devnet balance:", balance / 1e9, "SOL");
  
  // Try airdrop if balance is low
  if (balance < 0.2 * 1e9) {
    try {
      console.log("Requesting Devnet SOL airdrop...");
      const signature = await connection.requestAirdrop(
        wallet.publicKey,
        0.2 * 1e9 // 0.2 SOL
      );
      await connection.confirmTransaction(signature, 'confirmed');
      console.log("Airdrop successful");
    } catch (error) {
      console.error("Airdrop failed:", error);
    }
  }

  try {
    // Step 2: Setup Metaplex with a mock storage driver for Devnet testing
    const metaplex = Metaplex.make(connection)
      .use(keypairIdentity(Keypair.generate()));
    
    // Step 3: Use a mock URL for dev/testing
    const imageUri = `https://placehold.co/600x400?text=${config.symbol}`;

    // Step 4: Create metadata JSON with mock image
    const metadata = {
      name: config.name,
      symbol: config.symbol,
      description: config.description,
      image: imageUri,
      attributes: [
        { trait_type: 'Website', value: config.socialLinks.website || '' },
        { trait_type: 'Twitter', value: config.socialLinks.twitter || '' },
        { trait_type: 'Telegram', value: config.socialLinks.telegram || '' },
        { trait_type: 'Discord', value: config.socialLinks.discord || '' },
      ],
      ...(config.creatorInfo && {
        creator: {
          name: config.creatorInfo.name,
          website: config.creatorInfo.website,
        },
      }),
    };
    // Use a mock metadata URI for development purposes
    const metadataUri = `https://example.com/${config.symbol}.json`;
    
    console.log("Creating token mint...");
    
    // Step 5: Create the token mint manually with a keypair
    const mintKeypair = Keypair.generate();
    const mintPubkey = mintKeypair.publicKey;
    console.log("Mint keypair generated:", mintPubkey.toString());
    
    // Get the minimum lamports needed for the mint account
    const mintRent = await connection.getMinimumBalanceForRentExemption(82);
    
    // Create a transaction for the mint account
    const createMintTransaction = new Transaction().add(
      // Create the account
      SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: mintPubkey,
        space: 82,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      }),
      // Initialize the mint
      createInitializeMintInstruction(
        mintPubkey,
        config.decimals,
        wallet.publicKey,
        wallet.publicKey,
        TOKEN_PROGRAM_ID
      )
    );
    
    // Get the latest blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    createMintTransaction.recentBlockhash = blockhash;
    createMintTransaction.feePayer = wallet.publicKey;
    
    // Sign with mint keypair and wallet
    createMintTransaction.partialSign(mintKeypair);
    const signedTransaction = await wallet.signTransaction(createMintTransaction);
    
    // Send and confirm the transaction
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    console.log("Create mint transaction sent:", signature);
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    });
    console.log("Token mint created successfully!");
    
    // Step 6: Create associated token account
    const associatedTokenAddress = await getAssociatedTokenAddress(
      mintPubkey,
      wallet.publicKey
    );
    console.log("Token address:", associatedTokenAddress.toString());
    
    // Create a transaction for the associated token account
    const createAccountTransaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        associatedTokenAddress,
        wallet.publicKey,
        mintPubkey
      )
    );
    
    // Get a new blockhash
    const accountBlockhash = await connection.getLatestBlockhash('confirmed');
    createAccountTransaction.recentBlockhash = accountBlockhash.blockhash;
    createAccountTransaction.feePayer = wallet.publicKey;
    
    // Sign and send the transaction
    const signedAccountTx = await wallet.signTransaction(createAccountTransaction);
    const accountSignature = await connection.sendRawTransaction(signedAccountTx.serialize());
    console.log("Create token account transaction sent:", accountSignature);
    await connection.confirmTransaction({
      signature: accountSignature,
      blockhash: accountBlockhash.blockhash,
      lastValidBlockHeight: accountBlockhash.lastValidBlockHeight
    });
    console.log("Token account created successfully!");
    
    // Step 7: Mint tokens to the associated token account
    console.log("Minting tokens...");
    const mintToTransaction = new Transaction().add(
      createMintToInstruction(
        mintPubkey,
        associatedTokenAddress,
        wallet.publicKey,
        config.totalSupply * Math.pow(10, config.decimals)
      )
    );
    
    // Get a new blockhash
    const mintBlockhash = await connection.getLatestBlockhash('confirmed');
    mintToTransaction.recentBlockhash = mintBlockhash.blockhash;
    mintToTransaction.feePayer = wallet.publicKey;
    
    // Sign and send the transaction
    const signedMintTx = await wallet.signTransaction(mintToTransaction);
    const mintSignature = await connection.sendRawTransaction(signedMintTx.serialize());
    console.log("Mint tokens transaction sent:", mintSignature);
    await connection.confirmTransaction({
      signature: mintSignature,
      blockhash: mintBlockhash.blockhash,
      lastValidBlockHeight: mintBlockhash.lastValidBlockHeight
    });
    console.log("Token minting completed successfully!");
    
    // Step 8: Handle authority revocation if selected (would follow a similar pattern)
    // ...
    
    // Step 9: Return the result
    return {
      mintAddress: mintPubkey.toBase58(),
      tokenAddress: associatedTokenAddress.toBase58(),
      metadataUrl: metadataUri,
    };
  } catch (error) {
    console.error("Token creation error:", error);
    throw new Error(`Token creation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};