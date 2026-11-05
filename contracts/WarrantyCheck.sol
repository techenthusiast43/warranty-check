// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title WarrantyCheck
 * @notice Decentralized product warranty registration and verification contract for BOT Chain.
 * @dev Manages authorized sellers, immutable warranty registration, warranty status calculation,
 *      and transparent dispute voiding.
 */
contract WarrantyCheck {
    enum WarrantyStatus {
        Active,
        Expired,
        Void
    }

    struct Product {
        bytes32 productIdHash;      // Keccak256 hash of the unique product identifier
        string rawProductId;        // Original product serial or identifier
        string productName;         // Name/Model of the product
        address business;           // Registering business/manufacturer wallet
        uint256 purchaseTimestamp;  // Timestamp when product was sold/registered
        uint256 warrantyDuration;   // Duration of warranty in seconds
        bool isVoided;              // Has warranty been voided
        string voidReason;          // Documented reason if voided
        string metadataURI;         // Optional off-chain metadata (IPFS/spec link)
        bool exists;                // Existence check flag
    }

    address public admin;

    // Mapping of authorized seller/business addresses
    mapping(address => bool) public authorizedSellers;
    address[] public authorizedSellerList;

    // Mapping from productIdHash to Product
    mapping(bytes32 => Product) private products;
    
    // Array of all registered product hashes for querying/auditing
    bytes32[] public allProductHashes;

    // Mapping from business address to list of product hashes registered by them
    mapping(address => bytes32[]) private businessProducts;

    // Events
    event SellerAuthorized(address indexed seller, uint256 timestamp);
    event SellerRevoked(address indexed seller, uint256 timestamp);
    event ProductRegistered(
        bytes32 indexed productIdHash,
        string productId,
        string productName,
        address indexed business,
        uint256 purchaseTimestamp,
        uint256 warrantyDuration,
        uint256 expiryTimestamp
    );
    event WarrantyVoided(
        bytes32 indexed productIdHash,
        address indexed voidedBy,
        string reason,
        uint256 timestamp
    );
    event ProductInfoUpdated(
        bytes32 indexed productIdHash,
        string newName,
        string newMetadataURI,
        uint256 timestamp
    );
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    modifier onlyAdmin() {
        require(msg.sender == admin, "WarrantyCheck: caller is not the admin");
        _;
    }

    modifier onlyAuthorizedSeller() {
        require(
            authorizedSellers[msg.sender],
            "WarrantyCheck: caller is not an authorized seller"
        );
        _;
    }

    constructor() {
        admin = msg.sender;
        // The deployer/admin is also authorized as an initial seller for bootstrapping
        authorizedSellers[msg.sender] = true;
        authorizedSellerList.push(msg.sender);
        emit SellerAuthorized(msg.sender, block.timestamp);
    }

    /**
     * @notice Transfer contract administration to a new address.
     * @param newAdmin Address of the new admin.
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "WarrantyCheck: invalid new admin address");
        address oldAdmin = admin;
        admin = newAdmin;
        emit AdminTransferred(oldAdmin, newAdmin);
    }

    /**
     * @notice Authorize a business wallet to register products.
     * @param seller Address of the business to authorize.
     */
    function authorizeSeller(address seller) external onlyAdmin {
        require(seller != address(0), "WarrantyCheck: invalid seller address");
        require(!authorizedSellers[seller], "WarrantyCheck: seller already authorized");
        
        authorizedSellers[seller] = true;
        authorizedSellerList.push(seller);
        emit SellerAuthorized(seller, block.timestamp);
    }

    /**
     * @notice Revoke a business wallet's registration permission.
     * @param seller Address of the business to revoke.
     */
    function revokeSeller(address seller) external onlyAdmin {
        require(authorizedSellers[seller], "WarrantyCheck: seller is not authorized");
        
        authorizedSellers[seller] = false;
        emit SellerRevoked(seller, block.timestamp);
    }

    /**
     * @notice Register a product and its warranty on-chain.
     * @param productId Unique raw product identifier (e.g. serial number or UUID).
     * @param productName Product model or description.
     * @param purchaseTimestamp Unix timestamp of purchase (cannot be in future).
     * @param warrantyDuration Duration in seconds the warranty is valid for.
     * @param metadataURI Off-chain metadata URI (e.g., specifications, batch info).
     */
    function registerProduct(
        string calldata productId,
        string calldata productName,
        uint256 purchaseTimestamp,
        uint256 warrantyDuration,
        string calldata metadataURI
    ) external onlyAuthorizedSeller returns (bytes32) {
        require(bytes(productId).length > 0, "WarrantyCheck: product ID cannot be empty");
        require(bytes(productName).length > 0, "WarrantyCheck: product name cannot be empty");
        require(warrantyDuration > 0, "WarrantyCheck: warranty duration must be > 0");
        require(
            purchaseTimestamp <= block.timestamp + 300,
            "WarrantyCheck: purchase timestamp cannot be in the future"
        );

        bytes32 idHash = keccak256(abi.encodePacked(productId));
        require(!products[idHash].exists, "WarrantyCheck: product already registered");

        products[idHash] = Product({
            productIdHash: idHash,
            rawProductId: productId,
            productName: productName,
            business: msg.sender,
            purchaseTimestamp: purchaseTimestamp,
            warrantyDuration: warrantyDuration,
            isVoided: false,
            voidReason: "",
            metadataURI: metadataURI,
            exists: true
        });

        allProductHashes.push(idHash);
        businessProducts[msg.sender].push(idHash);

        uint256 expiryTimestamp = purchaseTimestamp + warrantyDuration;

        emit ProductRegistered(
            idHash,
            productId,
            productName,
            msg.sender,
            purchaseTimestamp,
            warrantyDuration,
            expiryTimestamp
        );

        return idHash;
    }

    /**
     * @notice Retrieve full registration and warranty details of a product by raw ID.
     * @param productId The product identifier.
     */
    function verifyProduct(string calldata productId)
        external
        view
        returns (
            bytes32 productIdHash,
            string memory rawProductId,
            string memory productName,
            address business,
            uint256 purchaseTimestamp,
            uint256 warrantyDuration,
            uint256 expiryTimestamp,
            WarrantyStatus status,
            bool isVoided,
            string memory voidReason,
            string memory metadataURI,
            bool exists
        )
    {
        bytes32 idHash = keccak256(abi.encodePacked(productId));
        return verifyProductByHash(idHash);
    }

    /**
     * @notice Retrieve full registration and warranty details of a product by hash.
     * @param idHash Keccak256 hash of the product identifier.
     */
    function verifyProductByHash(bytes32 idHash)
        public
        view
        returns (
            bytes32 productIdHash,
            string memory rawProductId,
            string memory productName,
            address business,
            uint256 purchaseTimestamp,
            uint256 warrantyDuration,
            uint256 expiryTimestamp,
            WarrantyStatus status,
            bool isVoided,
            string memory voidReason,
            string memory metadataURI,
            bool exists
        )
    {
        Product storage p = products[idHash];
        if (!p.exists) {
            return (
                idHash,
                "",
                "",
                address(0),
                0,
                0,
                0,
                WarrantyStatus.Void,
                false,
                "Product does not exist",
                "",
                false
            );
        }

        uint256 exp = p.purchaseTimestamp + p.warrantyDuration;
        WarrantyStatus currentStatus;

        if (p.isVoided) {
            currentStatus = WarrantyStatus.Void;
        } else if (block.timestamp > exp) {
            currentStatus = WarrantyStatus.Expired;
        } else {
            currentStatus = WarrantyStatus.Active;
        }

        return (
            p.productIdHash,
            p.rawProductId,
            p.productName,
            p.business,
            p.purchaseTimestamp,
            p.warrantyDuration,
            exp,
            currentStatus,
            p.isVoided,
            p.voidReason,
            p.metadataURI,
            true
        );
    }

    /**
     * @notice Get current warranty status and remaining time for a product.
     * @param productId The raw product identifier.
     */
    function getWarrantyStatus(string calldata productId)
        external
        view
        returns (
            WarrantyStatus status,
            uint256 expiryTimestamp,
            uint256 remainingSeconds,
            bool isVoided,
            string memory voidReason
        )
    {
        bytes32 idHash = keccak256(abi.encodePacked(productId));
        Product storage p = products[idHash];
        require(p.exists, "WarrantyCheck: product not found");

        uint256 exp = p.purchaseTimestamp + p.warrantyDuration;
        
        if (p.isVoided) {
            return (WarrantyStatus.Void, exp, 0, true, p.voidReason);
        } else if (block.timestamp > exp) {
            return (WarrantyStatus.Expired, exp, 0, false, "");
        } else {
            uint256 rem = exp - block.timestamp;
            return (WarrantyStatus.Active, exp, rem, false, "");
        }
    }

    /**
     * @notice Void a product warranty.
     * @dev Only the registering business or the contract admin can void a warranty.
     * @param productId The product identifier.
     * @param reason Documented reason for voiding (e.g. unauthorized tampering).
     */
    function voidWarranty(string calldata productId, string calldata reason) external {
        bytes32 idHash = keccak256(abi.encodePacked(productId));
        Product storage p = products[idHash];
        require(p.exists, "WarrantyCheck: product does not exist");
        require(!p.isVoided, "WarrantyCheck: warranty is already voided");
        require(
            msg.sender == admin || msg.sender == p.business,
            "WarrantyCheck: only admin or registering business can void"
        );
        require(bytes(reason).length > 0, "WarrantyCheck: void reason cannot be empty");

        p.isVoided = true;
        p.voidReason = reason;

        emit WarrantyVoided(idHash, msg.sender, reason, block.timestamp);
    }

    /**
     * @notice Update permitted product information.
     * @dev Only original business or admin can update.
     *      Original warranty terms (purchaseTimestamp, warrantyDuration) CANNOT be modified.
     * @param productId The product identifier.
     * @param newName Updated product name.
     * @param newMetadataURI Updated metadata URI.
     */
    function updateProductInfo(
        string calldata productId,
        string calldata newName,
        string calldata newMetadataURI
    ) external {
        bytes32 idHash = keccak256(abi.encodePacked(productId));
        Product storage p = products[idHash];
        require(p.exists, "WarrantyCheck: product does not exist");
        require(
            msg.sender == admin || msg.sender == p.business,
            "WarrantyCheck: only admin or registering business can update"
        );
        require(bytes(newName).length > 0, "WarrantyCheck: product name cannot be empty");

        p.productName = newName;
        p.metadataURI = newMetadataURI;

        emit ProductInfoUpdated(idHash, newName, newMetadataURI, block.timestamp);
    }

    /**
     * @notice Returns total number of registered products.
     */
    function getTotalProductsCount() external view returns (uint256) {
        return allProductHashes.length;
    }

    /**
     * @notice Returns product hashes registered by a specific business.
     */
    function getProductsByBusiness(address business)
        external
        view
        returns (bytes32[] memory)
    {
        return businessProducts[business];
    }

    /**
     * @notice Returns all authorized sellers.
     */
    function getAuthorizedSellers() external view returns (address[] memory) {
        return authorizedSellerList;
    }

    /**
     * @notice Check if an address is an authorized seller.
     */
    function isSellerAuthorized(address seller) external view returns (bool) {
        return authorizedSellers[seller];
    }
}

