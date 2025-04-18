declare module 'nft.storage' {
    export class NFTStorage {
      constructor(options: { token: string });
      store(data: {
        name: string;
        description: string;
        image: File;
      }): Promise<{
        url: string;
        data: {
          image: {
            href: string;
          };
          name: string;
          description: string;
        };
      }>;
      storeBlob(blob: Blob): Promise<string>;
    }
    export class File extends Blob {
      constructor(fileBits: BlobPart[], name: string, options?: FilePropertyBag);
      name: string;
      lastModified: number;
    }
  }