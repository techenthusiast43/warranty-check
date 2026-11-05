# WarrantyCheck — BOT Chain dApp

Decentralized product warranty registration and verification application built on **BOT Chain** (Chain ID: `968`).

WarrantyCheck provides an immutable, transparent registry where authorized manufacturers and merchants record authentic product warranties directly onto the blockchain. Customers and retailers can instantly verify warranty validity, remaining coverage, provenance, and void status via a unique Product ID or QR code.

---

## 🌟 Key Features

1. **Role-Based Smart Contract Permissions**:
   - **Administrator**: Controls authorized merchant/business wallets (`authorizeSeller`, `revokeSeller`).
   - **Authorized Businesses**: Can register products and generate verifiable warranty terms on-chain (`registerProduct`).
   - **Consumers & Public**: Can freely verify any product serial or scan QR codes (`verifyProduct`, `getWarrantyStatus`) with zero gas fees.
2. **Immutable Warranty Terms**:
   - Original purchase timestamp and warranty duration are strictly immutable once registered, preventing post-sale manipulation.
   - Non-critical metadata and model descriptions can be updated only by the original registering merchant or admin (`updateProductInfo`).
3. **Transparent Voiding Engine**:
   - In cases of unauthorized disassembly, water damage, or recalls, the issuer or admin can void a warranty on-chain (`voidWarranty`) with a documented public reason.
4. **Instant QR Code Generation & Verification**:
   - Automated high-resolution QR code generator for newly registered products.
   - Built-in camera scanner & image file upload to decode QR codes and verify status in seconds.
   - Printable official Warranty Certificate layout.
5. **Real Blockchain Interaction**:
   - Interacts with live smart contracts on BOT Chain (Chain ID `968`).
   - Real-time transaction lifecycle tracking: Signature Request $\to$ Mining $\to$ Confirmed with transaction hash and explorer link.
   - Bulky data kept off-chain with Keccak256 hashed product identifiers stored on-chain.

---

## ⛓️ BOT Chain Testnet Specifications

| Parameter | Value |
| :--- | :--- |
| **Network Name** | BOT Chain Testnet |
| **Chain ID** | `968` (`0x3c8`) |
| **RPC URL** | `https://rpc.bohr.life` |
| **Native Token** | BOT |
| **Total Supply** | 150 Million BOT |
| **Block Explorer** | [https://scan.bohr.life/](https://scan.bohr.life/) |

---

## 🛠️ Technology Stack

- **Smart Contract**: Solidity `^0.8.20`, Hardhat, Ethers.js v6
- **Frontend Framework**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Web3 Connectivity**: `@reown/appkit`, `@reown/appkit-adapter-wagmi`, `wagmi@2.x`, `viem`, `@tanstack/react-query`
- **QR Code Tools**: `qrcode.react`, `html5-qrcode`
- **Icons**: Lucide React

---

## 📂 Project Structure

```
warranty-check/
├── contracts/
│   └── WarrantyCheck.sol       # Solidity smart contract
├── test/
│   └── WarrantyCheck.test.ts   # Automated Hardhat test suite
├── scripts/
│   └── deploy.ts               # Deployment script for local and BOT Chain
├── src/
│   ├── abis/
│   │   └── WarrantyCheck.json  # Smart contract ABI
│   ├── components/
│   │   ├── Navbar.tsx          # Navigation, wallet connection & dev switcher
│   │   ├── Footer.tsx          # Network status and contract info
│   │   ├── StatusBadge.tsx     # Active / Expired / Void status badges
│   │   ├── QRCodeModal.tsx     # QR display, download PNG, and printable cert
│   │   └── QRScannerModal.tsx  # Webcam QR scanner & image upload decoder
│   ├── contexts/
│   │   └── Web3Context.tsx     # Wagmi + Viem context & role permissions
│   ├── pages/
│   │   ├── HomePage.tsx        # Landing page with instant lookup & features
│   │   ├── VerifyPage.tsx      # Real-time on-chain product verification
│   │   ├── BusinessDashboard.tsx # Product registration, QR generation & inventory
│   │   └── AdminDashboard.tsx  # Seller authorization & audit ledger
│   ├── utils/
│   │   └── botChain.ts         # Chain definition, formatters & time calculator
│   ├── config/
│   │   └── contractAddress.json # Deployed contract address configuration
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── hardhat.config.cjs
├── vite.config.ts
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### 1. Installation

```bash
npm install --legacy-peer-deps
```

### 2. Run Smart Contract Tests

Run the complete test suite verifying authorization, duplicate registration prevention, expiration calculations, and warranty voiding:

```bash
npx hardhat test
```

### 3. Deploy Contract

#### Option A: Local Hardhat Node

1. Start a local node:
   ```bash
   npx hardhat node
   ```
2. In another terminal, deploy the contract:
   ```bash
   npm run deploy:local
   ```

#### Option B: BOT Chain Testnet

Deploy directly to BOT Chain:
```bash
set PRIVATE_KEY=0xyour_private_key_here
npm run deploy:bot
```
The script will deploy `WarrantyCheck.sol`, report the contract address, and automatically write it into `src/config/contractAddress.json`.

### 4. Launch Frontend

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Smart Contract Test Coverage

The test suite (`test/WarrantyCheck.test.ts`) covers:

- ✅ **Deployment & Initial Roles**: Deployer receives admin and initial authorized seller role.
- ✅ **Seller Authorization**: Admin can authorize new business wallets; non-admins are rejected.
- ✅ **Seller Revocation**: Admin can revoke seller permissions; revoked sellers cannot register products.
- ✅ **Product Registration**: Authorized sellers register products with valid ID, name, purchase time, and duration.
- ✅ **Duplicate Prevention**: Reverts if identical product ID is submitted twice.
- ✅ **Input Validation**: Reverts on empty product ID, empty name, 0 duration, or future purchase timestamp.
- ✅ **Expiration Calculation**: Correctly calculates expiration and dynamically changes status from `Active` to `Expired` over time.
- ✅ **Warranty Voiding**: Registering business or admin can void warranty with a mandatory reason string; third parties cannot void; cannot void already voided warranty.
- ✅ **Permitted Updates**: Original business can update name and metadata; original warranty terms remain immutable.

---

## 📄 License

MIT

