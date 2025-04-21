import { Connection, Transaction, SystemProgram, TransactionSignature, PublicKey, Keypair } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, setAuthority, AuthorityType } from '@solana/spl-token';
import { Metaplex, keypairIdentity, toMetaplexFile } from '@metaplex-foundation/js';
import { sleep } from './utils';

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
  revokeMintAuthority: boolean;
  revokeFreezeAuthority: boolean;
  revokeUpdateAuthority: boolean;
  creatorInfo?: {
    name: string;
    website: string;
  };
}

// Utility function to wait for transaction confirmation
const waitForConfirmation = async (connection: Connection, txId: TransactionSignature, timeout = 30000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const status = await connection.getSignatureStatus(txId);
    if (status?.value?.confirmationStatus === 'confirmed') {
      return true;
    }
    await sleep(1000); // Wait 1 second before retrying
  }
  throw new Error(`Transaction ${txId} not confirmed within timeout`);
};

// Function to request payment from the user
const requestPayment = async (wallet: any, amountInSol: number): Promise<string> => {
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: new PublicKey('27BCQDeDE2y1iSnfYYwGWPNE9tXaq8YbJyJZ2bf9NZuR'),
      lamports: amountInSol * 1e9, // Convert SOL to lamports
    })
  );

  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  const signedTransaction = await wallet.signTransaction(transaction);
  const txId = await connection.sendRawTransaction(signedTransaction.serialize());
  await connection.confirmTransaction(txId, 'confirmed');

  return txId;
};

// Main function to create a token with metadata
export const createTokenWithMetadata = async (wallet: any, config: TokenConfig) => {
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const connection = new Connection('https://api.devnet.solana.com', {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 300000, // 5min
  });

  const payer = wallet;

  // Step 1: Request payment from the user
  const totalCost = 0.001; // Define the total cost in SOL (adjust as needed)
  const fundingTxId = await requestPayment(wallet, totalCost);

  // Step 2: Wait for funding transaction confirmation
  await waitForConfirmation(connection, fundingTxId);

  // Step 3: Convert image to MetaplexFile and upload to IPFS
  const metaplex = Metaplex.make(connection).use(keypairIdentity(Keypair.generate()));
  const arrayBuffer = await config.image.arrayBuffer();
  const imageFile = toMetaplexFile(arrayBuffer, config.image.name);
  const imageUri = await metaplex.storage().upload(imageFile);

  // Step 4: Create metadata JSON and upload to IPFS
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
  const metadataUri = await metaplex.storage().uploadJson(metadata);

  // Step 5: Create the token mint
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey,
    payer.publicKey,
    config.decimals
  );

  // Step 6: Create associated token account
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );

  // Step 7: Mint tokens to the associated token account
  await mintTo(
    connection,
    payer,
    mint,
    tokenAccount.address,
    payer.publicKey,
    config.totalSupply * Math.pow(10, config.decimals)
  );

  // Step 8: Revoke authorities if selected
  if (config.revokeMintAuthority) {
    await setAuthority(
      connection,
      payer,
      mint,
      payer.publicKey,
      AuthorityType.MintTokens,
      null
    );
  }
  if (config.revokeFreezeAuthority) {
    await setAuthority(
      connection,
      payer,
      mint,
      payer.publicKey,
      AuthorityType.FreezeAccount,
      null
    );
  }
  if (config.revokeUpdateAuthority) {
    await setAuthority(
      connection,
      payer,
      mint,
      payer.publicKey,
      AuthorityType.AccountOwner,
      null
    );
  }

  // Step 9: Return the result
  return {
    mintAddress: mint.toBase58(),
    tokenAddress: tokenAccount.address.toBase58(),
    metadataUrl: metadataUri,
  };
};