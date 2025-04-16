# TokenForge
 * 🚀 Proyecto: Creador de Tokens Meme en Solana
 * Objetivo: Desarrollar una aplicación web fullstack para crear tokens meme en la blockchain de Solana
 * Tecnología: React + TypeScript + Tailwind CSS + Solana Web3 SDK + Metaplex JS + IPFS + Vercel + Node.js (opcional)
 *
 * 👉 Funcionalidades Principales:
 *
 * 1. Autenticación con Phantom Wallet usando `@solana/wallet-adapter-react`
 *    - Botón de "Conectar Wallet" en el header.
 *    - Mostrar dirección conectada y opción de desconectar.
 *
 * 2. Formulario de Creación de Token SPL
 *    - Campos:
 *      - Nombre del token (string, requerido)
 *      - Símbolo (string, máx 8 caracteres, requerido)
 *      - Decimales (0-18, por defecto 9)
 *      - Total Supply (número, acepta comas como 1,000,000)
 *      - Imagen (archivo PNG/JPG, máx 5MB)
 *      - Descripción
 *      - Enlaces sociales (website, twitter, telegram, discord)
 *
 *    - Validaciones:
 *      - Requeridos
 *      - Lógica para impedir símbolo > 8 caracteres
 *      - Supply debe ser válido y mayor a 0
 *
 * 3. Opciones Avanzadas (checkboxes)
 *    - Revoke Mint Authority (+0.1 SOL)
 *    - Revoke Freeze Authority (+0.1 SOL)
 *    - Revoke Update Authority (+0.1 SOL)
 *    - Modificar información de creador (+0.1 SOL)
 *        - Nombre del creador
 *        - Website del creador
 *
 * 4. Cálculo dinámico del costo total (en SOL)
 *    - Base: 0.1 SOL
 *    - Sumar opciones seleccionadas
 *    - Mostrar total actualizado en tiempo real
 *
 * 5. Lógica de creación del token:
 *    - Conexión a la wallet Phantom
 *    - Subir imagen a IPFS (usando NFT.Storage o Pinata)
 *    - Crear metadatos usando Metaplex SDK (nombre, símbolo, descripción, imagen, enlaces)
 *    - Crear token SPL con `@solana/spl-token` (createMint, createAssociatedTokenAccount, mintTo)
 *    - Revocar autoridades con `setAuthority` si se selecciona
 *    - Añadir campos personalizados de creador si se pagó
 *
 * 6. (Opcional) Gestión de Liquidez con Raydium
 *    - Botones que redirigen a interfaces de creación de pools
 *
 * 👉 Tecnologías:
 * - Frontend: React + TypeScript + Tailwind CSS
 * - Solana SDKs: @solana/web3.js, @solana/spl-token, @solana/wallet-adapter, @metaplex-foundation/js
 * - IPFS Upload: NFT.Storage o Pinata
 * - Backend opcional: Node.js/Express o Next.js API Routes + MongoDB
 * - Hosting: Vercel (frontend), Railway/Heroku (backend)
 *
 * 👉 Tareas iniciales:
 * - [ ] Crear estructura de carpetas y componentes principales
 * - [ ] Instalar dependencias de wallet adapter y Solana SDK
 * - [ ] Crear header con botón de conexión a Phantom
 * - [ ] Construir formulario y validaciones
 * - [ ] Implementar carga a IPFS
 * - [ ] Crear token y metadatos con lógica de costos
 * - [ ] Añadir lógica para revocar autoridades
 * - [ ] Integrar UI limpia y responsive con Tailwind
