import {
  Connection,
  Transaction,
  SystemProgram,
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  AuthorityType,
  createSetAuthorityInstruction
} from '@solana/spl-token';
import { Metaplex } from '@metaplex-foundation/js';
import { PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import lighthouse from '@lighthouse-web3/sdk';
import base58 from 'bs58';
import 'dotenv/config';

// Token Extensions Program ID
const TOKEN_EXTENSIONS_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

// Dirección que recibirá los pagos
const FEE_RECEIVER_ADDRESS = new PublicKey('27BCQDeDE2y1iSnfYYwGWPNE9tXaq8YbJyJZ2bf9NZuR');

// Lighthouse API Key
const LIGHTHOUSE_API_KEY = process.env.REACT_APP_LIGHTHOUSE_API_KEY || 'YOUR_LIGHTHOUSE_API_KEY';

/**
 * Subir un archivo a Lighthouse Storage
 */
const uploadToLighthouse = async (file: File): Promise<string> => {
  console.log("Uploading to Lighthouse Storage...");
  try {
    const response = await lighthouse.upload([file], LIGHTHOUSE_API_KEY);
    console.log("Successfully uploaded to Lighthouse:", response.data.Hash);
    return response.data.Hash;
  } catch (error) {
    console.error("Error uploading to Lighthouse:", error);
    throw new Error("Failed to upload to Lighthouse Storage");
  }
};

/**
 * Interface defining token configuration options
 */
interface TokenConfig {
  name: string;
  symbol: string;
  description: string;
  decimals: number;
  totalSupply: number;
  image: File;
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
  revokeMintAuthority?: boolean;
  revokeFreezeAuthority?: boolean;
  revokeUpdateAuthority?: boolean;
}

/**
 * Creates a token with metadata
 */
export const createTokenWithMetadata = async (wallet: any, config: TokenConfig) => {
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  console.log("Connected wallet public key:", wallet.publicKey.toString());

  const RPC_URL = process.env.REACT_APP_SOLANA_RPC_URL || 
    'https://mainnet.helius-rpc.com/?api-key=895d7d11-1e28-4385-adc6-1eea29ef98cb';
  
  const connection = new Connection(RPC_URL, {
    commitment: 'confirmed'
  });

  // Calcular costo total
  let totalCost = 0.1; // Base
  if (config.revokeMintAuthority) totalCost += 0.08;
  if (config.revokeFreezeAuthority) totalCost += 0.08;
  if (config.revokeUpdateAuthority) totalCost += 0.08;
  if (config.creatorInfo) totalCost += 0.1;

  console.log(`Total cost: ${totalCost} SOL`);

  // Subir imagen y metadatos
  console.log("Uploading image to Lighthouse Storage...");
  const imageBlob = new Blob([await config.image.arrayBuffer()], { type: config.image.type });
  const imageFile = new File([imageBlob], 'image.png', { type: config.image.type });
  const imageCid = await uploadToLighthouse(imageFile);
  const imageUri = `https://gateway.lighthouse.storage/ipfs/${imageCid}`;
  console.log("Image URI:", imageUri);

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

  const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
  const metadataFile = new File([metadataBlob], 'metadata.json', { type: 'application/json' });
  const metadataCid = await uploadToLighthouse(metadataFile);
  const metadataUri = `https://gateway.lighthouse.storage/ipfs/${metadataCid}`;
  console.log("Metadata URI:", metadataUri);

  const mintKeypair = Keypair.generate();
  const mintPubkey = mintKeypair.publicKey;
  console.log("Mint address:", mintPubkey.toString());

  const metadataSpace = 82;
  const mintRent = await connection.getMinimumBalanceForRentExemption(metadataSpace);

  const associatedTokenAddress = await getAssociatedTokenAddress(
    mintPubkey,
    wallet.publicKey,
    false,
    TOKEN_EXTENSIONS_PROGRAM_ID
  );

  const mintAmount = config.totalSupply * Math.pow(10, config.decimals);

  // Crear la transacción
  const transaction = new Transaction();
  
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: FEE_RECEIVER_ADDRESS,
      lamports: Math.floor(totalCost * LAMPORTS_PER_SOL),
    })
  );

  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: mintPubkey,
      space: metadataSpace,
      lamports: mintRent,
      programId: TOKEN_EXTENSIONS_PROGRAM_ID,
    })
  );

  transaction.add(
    createInitializeMintInstruction(
      mintPubkey,
      config.decimals,
      wallet.publicKey,
      wallet.publicKey,
      TOKEN_EXTENSIONS_PROGRAM_ID
    )
  );

  transaction.add(
    createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      associatedTokenAddress,
      wallet.publicKey,
      mintPubkey,
      TOKEN_EXTENSIONS_PROGRAM_ID
    )
  );

  transaction.add(
    createMintToInstruction(
      mintPubkey,
      associatedTokenAddress,
      wallet.publicKey,
      mintAmount,
      [],
      TOKEN_EXTENSIONS_PROGRAM_ID
    )
  );

  // Si se solicita revocar la autoridad de acuñación
  if (config.revokeMintAuthority) {
    transaction.add(
      createSetAuthorityInstruction(
        mintPubkey,
        wallet.publicKey,
        AuthorityType.MintTokens,
        null,
        [],
        TOKEN_EXTENSIONS_PROGRAM_ID
      )
    );
  }

  // Si se solicita revocar la autoridad de congelación
  if (config.revokeFreezeAuthority) {
    transaction.add(
      createSetAuthorityInstruction(
        mintPubkey,
        wallet.publicKey,
        AuthorityType.FreezeAccount,
        null,
        [],
        TOKEN_EXTENSIONS_PROGRAM_ID
      )
    );
  }

  // Configurar el blockhash reciente y fee payer
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  // Firmar parcialmente con la keypair del mint
  transaction.partialSign(mintKeypair);

  try {
    console.log("Requesting wallet to sign and send transaction...");
    
    // Para Phantom Wallet compatible con Web3:
    // Método 1: Utilizar signTransaction seguido de sendRawTransaction
    const signedTransaction = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    
    console.log("Transaction signature:", signature);
    console.log("Waiting for transaction confirmation...");
    
    await connection.confirmTransaction(signature, 'confirmed');
    console.log("Transaction confirmed!");

    return {
      mintAddress: mintPubkey.toBase58(),
      tokenAddress: associatedTokenAddress.toBase58(),
      metadataUrl: metadataUri,
      imageUrl: imageUri,
      paymentInfo: {
        amount: totalCost,
        signature: signature,
      },
    };
  } catch (error) {
    console.error("Error signing and sending transaction:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to sign and send transaction: ${error.message}`);
    } else {
      throw new Error('Failed to sign and send transaction: Unknown error');
    }
  }
};