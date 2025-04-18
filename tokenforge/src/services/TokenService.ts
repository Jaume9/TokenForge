import { 
    Connection, 
    Keypair, 
    PublicKey, 
    Transaction, 
    sendAndConfirmTransaction, 
    clusterApiUrl,
    SystemProgram,
    TransactionInstruction
  } from '@solana/web3.js';
  import { 
    createMint, 
    getMint, 
    mintTo, 
    getOrCreateAssociatedTokenAccount, 
    AuthorityType,
    setAuthority,
    TOKEN_PROGRAM_ID
  } from '@solana/spl-token';
  import { NFTStorage, File } from 'nft.storage';
  
  // Import Metaplex-related modules
  import { 
    Metaplex, 
    keypairIdentity,
    findMetadataPda,
    walletAdapterIdentity
  } from '@metaplex-foundation/js';
  
  interface SocialLinks {
    website?: string;
    twitter?: string;
    telegram?: string;
    discord?: string;
  }
  
  interface CreatorInfo {
    name: string;
    website: string;
  }
  
  interface TokenConfig {
    name: string;
    symbol: string;
    description: string;
    decimals: number;
    totalSupply: number;
    image: File;
    socialLinks: SocialLinks;
    revokeMintAuthority: boolean;
    revokeFreezeAuthority: boolean;
    revokeUpdateAuthority: boolean;
    creatorInfo?: CreatorInfo;
  }
  
  // Get NFT.Storage API key from environment variables
  const NFT_STORAGE_API_KEY = process.env.REACT_APP_NFT_STORAGE_KEY;
  
  /**
   * Uploads an image to IPFS using NFT.Storage
   * @param imageFile The image file to upload
   * @returns The IPFS URL of the uploaded image
   */
export const uploadImageToIPFS = async (imageFile: File): Promise<string> => {
  if (!NFT_STORAGE_API_KEY) {
    throw new Error('NFT Storage API key not found. Please set REACT_APP_NFT_STORAGE_KEY in your .env file');
  }
  
  try {
    const nftStorage = new NFTStorage({ token: NFT_STORAGE_API_KEY });
    
    // Método corregido para usar storeBlob en lugar de store directamente
    console.log('Uploading image to IPFS...');
    const cid = await nftStorage.storeBlob(imageFile);
    const imageUrl = `https://ipfs.io/ipfs/${cid}`;
    
    console.log('Image uploaded to:', imageUrl);
    return imageUrl;
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw new Error('Failed to upload image to IPFS');
  }
};
  
  /**
   * Creates token metadata and uploads it to IPFS
   * @param config Token configuration
   * @param imageUrl IPFS URL of the token image
   * @returns IPFS URL of the token metadata
   */
  export const createTokenMetadata = async (
    config: TokenConfig, 
    imageUrl: string
  ): Promise<string> => {
    if (!NFT_STORAGE_API_KEY) {
      throw new Error('NFT Storage API key not found');
    }
    
    try {
      const nftStorage = new NFTStorage({ token: NFT_STORAGE_API_KEY });
      
      // Create metadata JSON
      const metadata = {
        name: config.name,
        symbol: config.symbol,
        description: config.description,
        image: imageUrl,
        attributes: [],
        properties: {
          files: [
            {
              uri: imageUrl,
              type: 'image/png'
            }
          ],
          category: 'image',
          creators: [] as { name: string; website: string }[]
        },
        links: config.socialLinks
      };
  
      if (config.creatorInfo) {
        metadata.properties.creators.push({
          name: config.creatorInfo.name,
          website: config.creatorInfo.website
        });
      }
      
      // Convert metadata to a blob
      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
      const metadataFile = new File([metadataBlob], 'metadata.json', { type: 'application/json' });
      
      // Store the metadata file and get IPFS CID
      console.log('Uploading metadata to IPFS...');
      const result = await nftStorage.storeBlob(metadataFile);
      const metadataUrl = `https://ipfs.io/ipfs/${result}`;
      console.log('Metadata uploaded to:', metadataUrl);
      
      return metadataUrl;
    } catch (error) {
      console.error('Error creating token metadata:', error);
      throw new Error('Failed to create token metadata');
    }
  };
  
  /**
   * Creates a new SPL token with the specified configuration
   * @param connection Solana connection
   * @param payer Wallet public key of the payer
   * @param config Token configuration
   * @param metadataUrl IPFS URL of the token metadata
   * @returns Object containing mint address and transaction signature
   */
  export const createToken = async (
    connection: Connection,
    wallet: any,
    config: TokenConfig,
    metadataUrl: string
  ) => {
    try {
      console.log('Creating new token mint...');
      
      // Create new mint account
      const mint = await createMint(
        connection,
        wallet,            // payer
        wallet.publicKey,  // mint authority
        wallet.publicKey,  // freeze authority
        config.decimals    // decimals
      );
      
      console.log('Token mint created:', mint.toString());
      
      // Create associated token account for the user
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet,
        mint,
        wallet.publicKey
      );
      
      console.log('Token account created:', tokenAccount.address.toString());
      
      // Convert total supply to proper amount based on decimals
      const totalSupply = config.totalSupply * Math.pow(10, config.decimals);
      
      // Mint the tokens to the token account
      console.log(`Minting ${config.totalSupply} tokens...`);
      const mintTx = await mintTo(
        connection,
        wallet,
        mint,
        tokenAccount.address,
        wallet.publicKey,
        totalSupply
      );
      
      console.log('Tokens minted, transaction:', mintTx);
      
      // Skip metadata creation for now - it's causing dependency issues
      console.log('Skipping metadata creation due to compatibility issues.');
      console.log('Token created successfully without metadata.');
      
      // Revoke mint and freeze authority if requested
      if (config.revokeMintAuthority || config.revokeFreezeAuthority) {
        await handleAuthorityRevocation(
          connection,
          wallet,
          mint,
          config.revokeMintAuthority,
          config.revokeFreezeAuthority
        );
      }
      
      return {
        mintAddress: mint.toString(),
        tokenAddress: tokenAccount.address.toString(),
        txId: mintTx,
        metadataStatus: 'skipped'
      };
    } catch (error) {
      console.error('Error creating token:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to create token: ${error.message}`);
      } else {
        throw new Error('Failed to create token: Unknown error');
      }
    }
  };
  
  /**
   * Handles revoking mint and/or freeze authorities if selected
   * @param connection Solana connection
   * @param wallet Connected wallet
   * @param mintAddress Token mint address
   * @param revokeMint Whether to revoke mint authority
   * @param revokeFreeze Whether to revoke freeze authority
   */
  const handleAuthorityRevocation = async (
    connection: Connection,
    wallet: any,
    mintAddress: PublicKey,
    revokeMint: boolean,
    revokeFreeze: boolean
  ) => {
    try {
      // No authority address (null) effectively burns the authority
      const newAuthority = null;
      
      if (revokeMint) {
        console.log('Revoking mint authority...');
        await setAuthority(
          connection,
          wallet,
          mintAddress,
          wallet.publicKey,
          AuthorityType.MintTokens,
          newAuthority
        );
        console.log('Mint authority revoked');
      }
      
      if (revokeFreeze) {
        console.log('Revoking freeze authority...');
        await setAuthority(
          connection,
          wallet,
          mintAddress,
          wallet.publicKey,
          AuthorityType.FreezeAccount,
          newAuthority
        );
        console.log('Freeze authority revoked');
      }
    } catch (error) {
      console.error('Error revoking authorities:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to revoke authority: ${error.message}`);
      } else {
        throw new Error('Failed to revoke authority: Unknown error');
      }
    }
  };
  
  /**
   * Main function to create a new token with metadata
   * @param wallet Connected wallet
   * @param config Token configuration
   * @returns Object containing token information
   */
  export const createTokenWithMetadata = async (
    wallet: any,
    config: TokenConfig
  ) => {
    try {
      console.log('Starting token creation process');
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      
      // Upload image to IPFS
      console.log('Uploading image...');
      const imageUrl = await uploadImageToIPFS(config.image);
      
      // Create and upload metadata
      console.log('Creating metadata...');
      const metadataUrl = await createTokenMetadata(config, imageUrl);
      
      // Create the token
      console.log('Creating token...');
      const tokenInfo = await createToken(connection, wallet, config, metadataUrl);
      
      return {
        ...tokenInfo,
        imageUrl,
        metadataUrl
      };
    } catch (error) {
      console.error('Error in token creation process:', error);
      throw error;
    }
  };