interface PhantomProvider {
    isPhantom: boolean;
    isConnected: boolean;
    publicKey: {
      toString(): string;
    };
    connect(): Promise<{ publicKey: string }>;
    disconnect(): Promise<void>;
    signTransaction(transaction: any): Promise<any>;
    signAllTransactions(transactions: any[]): Promise<any[]>;
  }
  
  interface Window {
    solana?: PhantomProvider;
  }