import { 
  Connection, 
  Transaction, 
  SystemProgram, 
  PublicKey, 
  Keypair,
  sendAndConfirmTransaction,
  VersionedTransaction,
  TransactionMessage,
  LAMPORTS_PER_SOL
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
  walletAdapterIdentity,
  toMetaplexFile
} from '@metaplex-foundation/js';
import { PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import lighthouse from '@lighthouse-web3/sdk';
import 'dotenv/config';

// Token Extensions Program ID (replaces standard Token Program for tokens with metadata)
const TOKEN_EXTENSIONS_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

// Dirección que recibirá los pagos
const FEE_RECEIVER_ADDRESS = new PublicKey('27BCQDeDE2y1iSnfYYwGWPNE9tXaq8YbJyJZ2bf9NZuR');

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
 * Derivar la dirección de la cuenta de metadatos de Metaplex para un token
 */
const findMetadataPda = (mint: PublicKey): PublicKey => {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
  return pda;
};

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

  //devnet
  //const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  // Configuración del RPC con Helius
  const RPC_URL = process.env.REACT_APP_SOLANA_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=895d7d11-1e28-4385-adc6-1eea29ef98cb';
  console.log("Using RPC endpoint:", RPC_URL.replace(/api-key=([^&]+)/, 'api-key=****')); // Log seguro sin mostrar la clave completa
  
  // Conexión mejorada con retry y mejor configuración
  const connection = new Connection(RPC_URL, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
    disableRetryOnRateLimit: false
  });

  try {
    const balance = await connection.getBalance(wallet.publicKey);
    console.log("Wallet balance:", balance / LAMPORTS_PER_SOL, "SOL");
  } catch (error) {
    console.error("Error getting wallet balance:", error);
    
    if (error instanceof Error && error.message && (error.message.includes('403') || error.message.includes('429'))) {
      throw new Error("Error de conexión RPC: Límite de solicitudes excedido o problema de autorización.");
    }
    
    if (error instanceof Error) {
      throw new Error(`No se pudo obtener el saldo de la wallet: ${error.message}`);
    } else {
      throw new Error('No se pudo obtener el saldo de la wallet: Error desconocido');
    }
  }

  // Calcular costo total
  let totalCost = 0.1; // Base
  if (config.revokeMintAuthority) totalCost += 0.05;
  if (config.revokeFreezeAuthority) totalCost += 0.05;
  if (config.revokeUpdateAuthority) totalCost += 0.05;
  if (config.creatorInfo) totalCost += 0.05;
  
  // Verificar si el usuario tiene suficiente saldo
  /*
  if (balance / LAMPORTS_PER_SOL < totalCost + 0.01) { // +0.01 para tarifas de transacción
    
    // Si no tiene suficiente SOL en devnet, solicitar un airdrop
    //Devnet
    /*
    if (balance < 0.5 * LAMPORTS_PER_SOL) {
      try {
        console.log("Requesting Devnet SOL airdrop...");
        const signature = await connection.requestAirdrop(wallet.publicKey, 0.5 * LAMPORTS_PER_SOL);
        await confirmTransaction(connection, signature);
        console.log("Airdrop successful");
      } catch (error) {
        console.error("Airdrop failed:", error);
      }
    }
    


    // Verificar de nuevo después del airdrop
    const newBalance = await connection.getBalance(wallet.publicKey);
    if (newBalance / LAMPORTS_PER_SOL < totalCost + 0.01) {
      throw new Error(`Saldo insuficiente. Necesitas al menos ${totalCost.toFixed(2)} SOL para esta operación.`);
    }
  }*/

  try {
    // Mostrar opciones seleccionadas y costo
    console.log(`Opciones seleccionadas:`);
    console.log(`- Creación básica del token: 0.1 SOL`);
    if (config.revokeMintAuthority) console.log(`- Revocar Mint Authority: 0.05 SOL`);
    if (config.revokeFreezeAuthority) console.log(`- Revocar Freeze Authority: 0.05 SOL`);
    if (config.revokeUpdateAuthority) console.log(`- Revocar Update Authority: 0.05 SOL`);
    if (config.creatorInfo) console.log(`- Información del creador: 0.05 SOL`);
    console.log(`Costo total: ${totalCost} SOL`);
    
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
    
    // 0. NUEVO: Añadir instrucción de pago al principio
    const lamportsToTransfer = Math.floor(totalCost * LAMPORTS_PER_SOL);
    combinedTransaction.add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: FEE_RECEIVER_ADDRESS,
        lamports: lamportsToTransfer
      })
    );

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

    // 5. Añadir instrucciones para metadatos on-chain
    const metadataPDA = findMetadataPda(mintPubkey);

    // Utilizando Metaplex para crear los metadatos
    const metaplex = Metaplex.make(connection).use(walletAdapterIdentity({
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions,
    }));
    
    console.log("Creando metadatos on-chain...");
    
    // Añadir instrucción para crear metadatos (usando directamente Metaplex)
    const createSftBuilder = await metaplex.nfts().builders().createSft({
      name: config.name,
      symbol: config.symbol,
      uri: metadataUri, 
      sellerFeeBasisPoints: 0,
      useNewMint: mintKeypair,
      isMutable: !config.revokeUpdateAuthority,
      isCollection: false,
      creators: config.creatorInfo ? [
        {
          address: wallet.publicKey,
          share: 100,
        }
      ] : undefined
    });

    // Añadir instrucciones de metadatos a la transacción combinada
    for (const instruction of createSftBuilder.getInstructions()) {
      combinedTransaction.add(instruction);
    }

    // 6. Añadir instrucciones condicionales para revocar autoridades
    if (config.revokeMintAuthority) {
      console.log("Agregando instrucción para revocar Mint Authority");
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
      console.log("Agregando instrucción para revocar Freeze Authority");
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

    // Revocar la autoridad de actualización estableciendo isMutable en false ya se manejó anteriormente
    // en la instrucción de creación de metadatos (si config.revokeUpdateAuthority es true)
    if (config.revokeUpdateAuthority) {
      console.log("Metadatos configurados como inmutables (Update Authority revocada)");
    }

    // Configurar la transacción con el último hash de bloque y el pagador de la cuota
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    combinedTransaction.recentBlockhash = blockhash;
    combinedTransaction.feePayer = wallet.publicKey;

    // Firmar parcialmente con el keypair del mint (necesario para crear la cuenta)
    combinedTransaction.partialSign(mintKeypair);

    console.log("Solicitando firma de la wallet para la transacción combinada (incluye pago)...");
    
    // Firmar la transacción con la wallet conectada
    const signedTx = await wallet.signTransaction(combinedTransaction);
    
    // Enviar la transacción firmada
    console.log(`Enviando transacción única (incluye pago de ${totalCost} SOL)...`);
    const signature = await connection.sendRawTransaction(signedTx.serialize());
    
    console.log("Transacción enviada:", signature);
    console.log("Esperando confirmación...");
    
    // Esperar la confirmación de la transacción
    await confirmTransaction(connection, signature);
    
    console.log("¡Token creado y pago completado exitosamente en una única transacción!");

    return {
      mintAddress: mintPubkey.toBase58(),
      tokenAddress: associatedTokenAddress.toBase58(),
      metadataUrl: metadataUri,
      imageUrl: imageUri,
      paymentInfo: {
        amount: totalCost,
        signature: signature
      }
    };
  } catch (error) {
    console.error("Error en la creación del token:", error);
    throw new Error(`Token creation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};