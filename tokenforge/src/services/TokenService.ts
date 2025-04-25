import { 
  Connection, 
  Transaction, 
  SystemProgram, 
  PublicKey, 
  Keypair,
  sendAndConfirmTransaction,
  VersionedTransaction,
  TransactionMessage
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  AuthorityType,
  createSetAuthorityInstruction
} from '@solana/spl-token';
import { 
  Metaplex, 
  keypairIdentity,
  CreateNftInput,
  toMetaplexFile
} from '@metaplex-foundation/js';
import { DataV2 } from '@metaplex-foundation/mpl-token-metadata';
import lighthouse from '@lighthouse-web3/sdk';

// Token Extensions Program ID (replaces standard Token Program for tokens with metadata)
const TOKEN_EXTENSIONS_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

// Metaplex Token Metadata Program
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// Lighthouse API Key
const LIGHTHOUSE_API_KEY = process.env.REACT_APP_LIGHTHOUSE_API_KEY || 'YOUR_LIGHTHOUSE_API_KEY';

/**
 * Subir un archivo a Lighthouse Storage
 * @param file Archivo a subir
 * @returns CID del archivo subido
 */
const uploadToLighthouse = async (file: File): Promise<string> => {
  console.log("Uploading to Lighthouse Storage...");
  try {
    // Lighthouse espera un array de archivos
    const response = await lighthouse.upload([file], LIGHTHOUSE_API_KEY);
    console.log("Successfully uploaded to Lighthouse:", response.data.Hash);
    return response.data.Hash; // CID del archivo subido
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
  createLiquidityPool?: boolean;
  pairWithToken?: string; // SOL, USDC, etc.
  initialLiquidityAmount?: number;
}

/**
 * Helper function to confirm transaction completion
 */
async function confirmTransaction(connection: Connection, signature: string): Promise<void> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight
  });
}

/**
 * Creates a token with metadata following Solana documentation best practices
 * @param wallet Connected wallet to use for signing transactions
 * @param config Token configuration options
 * @returns Object with token addresses and related information
 */
export const createTokenWithMetadata = async (wallet: any, config: TokenConfig) => {
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  console.log("Connected wallet public key:", wallet.publicKey.toString());
  
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Wallet Devnet balance:", balance / 1e9, "SOL");
  
  if (balance < 0.5 * 1e9) {
    try {
      console.log("Requesting Devnet SOL airdrop...");
      const signature = await connection.requestAirdrop(wallet.publicKey, 0.5 * 1e9);
      await confirmTransaction(connection, signature);
      console.log("Airdrop successful");
    } catch (error) {
      console.error("Airdrop failed:", error);
    }
  }

  try {
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

    console.log("Creating token with all instructions...");
    const mintKeypair = Keypair.generate();
    const mintPubkey = mintKeypair.publicKey;
    console.log("Mint address:", mintPubkey.toString());

    // Calcular espacio y renta mínima para la cuenta del token
    const metadataSpace = 82;
    const mintRent = await connection.getMinimumBalanceForRentExemption(metadataSpace);

    // Obtener la dirección de la cuenta de token asociada
    const associatedTokenAddress = await getAssociatedTokenAddress(
      mintPubkey,
      wallet.publicKey,
      false,
      TOKEN_EXTENSIONS_PROGRAM_ID
    );

    // Calcular el monto de tokens a acuñar
    const mintAmount = config.totalSupply * Math.pow(10, config.decimals);

    // Crear una única transacción con todas las instrucciones necesarias
    const combinedTransaction = new Transaction();

    // 1. Instrucción para crear la cuenta del mint
    combinedTransaction.add(
      SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: mintPubkey,
        space: metadataSpace,
        lamports: mintRent,
        programId: TOKEN_EXTENSIONS_PROGRAM_ID,
      })
    );

    // 2. Instrucción para inicializar el mint
    combinedTransaction.add(
      createInitializeMintInstruction(
        mintPubkey,
        config.decimals,
        wallet.publicKey,
        wallet.publicKey,
        TOKEN_EXTENSIONS_PROGRAM_ID
      )
    );

    // 3. Instrucción para crear la cuenta de token asociada
    combinedTransaction.add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        associatedTokenAddress,
        wallet.publicKey,
        mintPubkey,
        TOKEN_EXTENSIONS_PROGRAM_ID
      )
    );

    // 4. Instrucción para acuñar tokens
    combinedTransaction.add(
      createMintToInstruction(
        mintPubkey,
        associatedTokenAddress,
        wallet.publicKey,
        mintAmount,
        [],
        TOKEN_EXTENSIONS_PROGRAM_ID
      )
    );

    // 5. Añadir instrucciones condicionales para revocar autoridades
    if (config.revokeMintAuthority) {
      combinedTransaction.add(
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

    if (config.revokeFreezeAuthority) {
      combinedTransaction.add(
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

    // Configurar la transacción con el último hash de bloque y el pagador de la cuota
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    combinedTransaction.recentBlockhash = blockhash;
    combinedTransaction.feePayer = wallet.publicKey;

    // Firmar parcialmente con el keypair del mint (necesario para crear la cuenta)
    combinedTransaction.partialSign(mintKeypair);

    console.log("Solicitando firma de la wallet para la transacción combinada...");
    
    // Firmar la transacción con la wallet conectada
    const signedTx = await wallet.signTransaction(combinedTransaction);
    
    // Enviar la transacción firmada
    console.log("Enviando transacción combinada...");
    const signature = await connection.sendRawTransaction(signedTx.serialize());
    
    console.log("Transacción enviada:", signature);
    console.log("Esperando confirmación...");
    
    // Esperar la confirmación de la transacción
    await confirmTransaction(connection, signature);
    
    console.log("¡Token creado exitosamente con una única transacción!");

    return {
      mintAddress: mintPubkey.toBase58(),
      tokenAddress: associatedTokenAddress.toBase58(),
      metadataUrl: metadataUri,
      imageUrl: imageUri,
    };
  } catch (error) {
    console.error("Error en la creación del token:", error);
    throw new Error(`Token creation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Función alternativa para crear los metadatos del token manualmente
 * Esta función podría usarse como reemplazo si el SDK de Metaplex causa problemas
 */
async function createTokenMetadata(
  connection: Connection, 
  wallet: any, 
  mintPubkey: PublicKey, 
  metadataUri: string, 
  tokenName: string, 
  tokenSymbol: string
) {
  try {
    // Aquí iría la lógica para crear los metadatos manualmente usando instrucciones
    // directas en lugar de depender de Metaplex SDK
    console.log("Implementación manual de metadatos pendiente");
  } catch (error) {
    console.error("Failed to manually create token metadata:", error);
    throw error;
  }
}