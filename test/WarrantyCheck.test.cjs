const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("WarrantyCheck Contract", function () {
  let warrantyCheck;
  let admin;
  let seller1;
  let seller2;
  let customer;
  let unauthorizedUser;

  beforeEach(async function () {
    [admin, seller1, seller2, customer, unauthorizedUser] = await ethers.getSigners();

    const WarrantyCheckFactory = await ethers.getContractFactory("WarrantyCheck");
    warrantyCheck = await WarrantyCheckFactory.deploy();
    await warrantyCheck.waitForDeployment();
  });

  describe("Deployment and Initial Roles", function () {
    it("should set deployer as admin and authorized seller", async function () {
      expect(await warrantyCheck.admin()).to.equal(admin.address);
      expect(await warrantyCheck.isSellerAuthorized(admin.address)).to.be.true;
    });

    it("should have zero registered products initially", async function () {
      expect(await warrantyCheck.getTotalProductsCount()).to.equal(0);
    });
  });

  describe("Seller Authorization & Revocation", function () {
    it("should allow admin to authorize a new seller", async function () {
      await expect(warrantyCheck.connect(admin).authorizeSeller(seller1.address))
        .to.emit(warrantyCheck, "SellerAuthorized");

      expect(await warrantyCheck.isSellerAuthorized(seller1.address)).to.be.true;
    });

    it("should reject authorizing an already authorized seller", async function () {
      await warrantyCheck.connect(admin).authorizeSeller(seller1.address);
      await expect(
        warrantyCheck.connect(admin).authorizeSeller(seller1.address)
      ).to.be.revertedWith("WarrantyCheck: seller already authorized");
    });

    it("should not allow non-admin to authorize a seller", async function () {
      await expect(
        warrantyCheck.connect(seller1).authorizeSeller(seller2.address)
      ).to.be.revertedWith("WarrantyCheck: caller is not the admin");
    });

    it("should allow admin to revoke a seller", async function () {
      await warrantyCheck.connect(admin).authorizeSeller(seller1.address);
      expect(await warrantyCheck.isSellerAuthorized(seller1.address)).to.be.true;

      await expect(warrantyCheck.connect(admin).revokeSeller(seller1.address))
        .to.emit(warrantyCheck, "SellerRevoked");

      expect(await warrantyCheck.isSellerAuthorized(seller1.address)).to.be.false;
    });

    it("should not allow non-admin to revoke a seller", async function () {
      await warrantyCheck.connect(admin).authorizeSeller(seller1.address);
      await expect(
        warrantyCheck.connect(unauthorizedUser).revokeSeller(seller1.address)
      ).to.be.revertedWith("WarrantyCheck: caller is not the admin");
    });
  });

  describe("Product Registration", function () {
    const productId = "SN-MACBOOK-2026-X99";
    const productName = "MacBook Pro M4 16-inch";
    const warrantyDuration = 365 * 24 * 60 * 60; // 1 year in seconds
    const metadataURI = "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";

    beforeEach(async function () {
      await warrantyCheck.connect(admin).authorizeSeller(seller1.address);
    });

    it("should allow authorized seller to register a product", async function () {
      const now = await time.latest();

      await expect(
        warrantyCheck
          .connect(seller1)
          .registerProduct(productId, productName, now, warrantyDuration, metadataURI)
      ).to.emit(warrantyCheck, "ProductRegistered");

      expect(await warrantyCheck.getTotalProductsCount()).to.equal(1);

      const verified = await warrantyCheck.verifyProduct(productId);
      expect(verified.rawProductId).to.equal(productId);
      expect(verified.productName).to.equal(productName);
      expect(verified.business).to.equal(seller1.address);
      expect(verified.purchaseTimestamp).to.equal(now);
      expect(verified.warrantyDuration).to.equal(warrantyDuration);
      expect(verified.isVoided).to.be.false;
      expect(verified.status).to.equal(0); // 0 = Active
      expect(verified.exists).to.be.true;
    });

    it("should revert if an unauthorized wallet attempts registration", async function () {
      const now = await time.latest();
      await expect(
        warrantyCheck
          .connect(unauthorizedUser)
          .registerProduct(productId, productName, now, warrantyDuration, metadataURI)
      ).to.be.revertedWith("WarrantyCheck: caller is not an authorized seller");
    });

    it("should prevent duplicate product registrations", async function () {
      const now = await time.latest();
      await warrantyCheck
        .connect(seller1)
        .registerProduct(productId, productName, now, warrantyDuration, metadataURI);

      await expect(
        warrantyCheck
          .connect(seller1)
          .registerProduct(productId, "Duplicate Item", now, warrantyDuration, metadataURI)
      ).to.be.revertedWith("WarrantyCheck: product already registered");
    });

    it("should validate input constraints (empty id, zero duration, future timestamp)", async function () {
      const now = await time.latest();

      // Empty ID
      await expect(
        warrantyCheck
          .connect(seller1)
          .registerProduct("", productName, now, warrantyDuration, metadataURI)
      ).to.be.revertedWith("WarrantyCheck: product ID cannot be empty");

      // Empty name
      await expect(
        warrantyCheck
          .connect(seller1)
          .registerProduct("ID-VALID", "", now, warrantyDuration, metadataURI)
      ).to.be.revertedWith("WarrantyCheck: product name cannot be empty");

      // Zero duration
      await expect(
        warrantyCheck
          .connect(seller1)
          .registerProduct("ID-VALID", productName, now, 0, metadataURI)
      ).to.be.revertedWith("WarrantyCheck: warranty duration must be > 0");

      // Future timestamp
      const farFuture = now + 10000;
      await expect(
        warrantyCheck
          .connect(seller1)
          .registerProduct("ID-VALID", productName, farFuture, warrantyDuration, metadataURI)
      ).to.be.revertedWith("WarrantyCheck: purchase timestamp cannot be in the future");
    });
  });

  describe("Warranty Expiration & Verification", function () {
    const productId = "SN-SONY-CAM-882";
    const productName = "Sony Alpha 7 IV";
    const warrantyDuration = 30 * 24 * 60 * 60; // 30 days
    let purchaseTime;

    beforeEach(async function () {
      await warrantyCheck.connect(admin).authorizeSeller(seller1.address);
      purchaseTime = await time.latest();
      await warrantyCheck
        .connect(seller1)
        .registerProduct(productId, productName, purchaseTime, warrantyDuration, "");
    });

    it("should return Active status and remaining time within warranty period", async function () {
      const statusRes = await warrantyCheck.getWarrantyStatus(productId);
      expect(statusRes.status).to.equal(0); // Active
      expect(statusRes.isVoided).to.be.false;
      expect(statusRes.remainingSeconds).to.be.gt(0);
    });

    it("should transition to Expired status after warranty duration elapses", async function () {
      // Advance blockchain time by 31 days
      await time.increase(31 * 24 * 60 * 60);

      const statusRes = await warrantyCheck.getWarrantyStatus(productId);
      expect(statusRes.status).to.equal(1); // 1 = Expired
      expect(statusRes.isVoided).to.be.false;
      expect(statusRes.remainingSeconds).to.equal(0);

      const verified = await warrantyCheck.verifyProduct(productId);
      expect(verified.status).to.equal(1); // Expired
    });

    it("should allow anyone (e.g. customer) to verify product details", async function () {
      const verified = await warrantyCheck.connect(customer).verifyProduct(productId);
      expect(verified.productName).to.equal(productName);
      expect(verified.business).to.equal(seller1.address);
      expect(verified.exists).to.be.true;
    });

    it("should return exists=false for non-existent product", async function () {
      const verified = await warrantyCheck.verifyProduct("NON-EXISTENT-ID");
      expect(verified.exists).to.be.false;
      expect(verified.productName).to.equal("");
    });
  });

  describe("Warranty Voiding", function () {
    const productId = "SN-DJI-DRONE-500";
    const productName = "DJI Mavic 3 Pro";
    const warrantyDuration = 180 * 24 * 60 * 60; // 180 days

    beforeEach(async function () {
      await warrantyCheck.connect(admin).authorizeSeller(seller1.address);
      const now = await time.latest();
      await warrantyCheck
        .connect(seller1)
        .registerProduct(productId, productName, now, warrantyDuration, "");
    });

    it("should allow registering seller to void warranty with reason", async function () {
      const reason = "Water damage detected beyond IPX rating";

      await expect(warrantyCheck.connect(seller1).voidWarranty(productId, reason))
        .to.emit(warrantyCheck, "WarrantyVoided");

      const statusRes = await warrantyCheck.getWarrantyStatus(productId);
      expect(statusRes.status).to.equal(2); // 2 = Void
      expect(statusRes.isVoided).to.be.true;
      expect(statusRes.voidReason).to.equal(reason);

      const verified = await warrantyCheck.verifyProduct(productId);
      expect(verified.status).to.equal(2);
      expect(verified.isVoided).to.be.true;
      expect(verified.voidReason).to.equal(reason);
    });

    it("should allow contract admin to void warranty", async function () {
      const reason = "Administrative recall - counterfeit serial report";
      await expect(warrantyCheck.connect(admin).voidWarranty(productId, reason))
        .to.emit(warrantyCheck, "WarrantyVoided");

      const statusRes = await warrantyCheck.getWarrantyStatus(productId);
      expect(statusRes.status).to.equal(2);
    });

    it("should not allow unauthorized third party or another seller to void warranty", async function () {
      await warrantyCheck.connect(admin).authorizeSeller(seller2.address);

      await expect(
        warrantyCheck.connect(seller2).voidWarranty(productId, "Malicious attempt")
      ).to.be.revertedWith("WarrantyCheck: only admin or registering business can void");

      await expect(
        warrantyCheck.connect(unauthorizedUser).voidWarranty(productId, "Malicious attempt")
      ).to.be.revertedWith("WarrantyCheck: only admin or registering business can void");
    });

    it("should prevent voiding an already voided warranty", async function () {
      await warrantyCheck.connect(seller1).voidWarranty(productId, "First void");
      await expect(
        warrantyCheck.connect(seller1).voidWarranty(productId, "Second void attempt")
      ).to.be.revertedWith("WarrantyCheck: warranty is already voided");
    });

    it("should reject voiding with empty reason", async function () {
      await expect(
        warrantyCheck.connect(seller1).voidWarranty(productId, "")
      ).to.be.revertedWith("WarrantyCheck: void reason cannot be empty");
    });
  });

  describe("Updating Product Info", function () {
    const productId = "SN-BOSE-HEADPHONE-77";
    const productName = "Bose QC45";
    const warrantyDuration = 365 * 24 * 60 * 60;

    beforeEach(async function () {
      await warrantyCheck.connect(admin).authorizeSeller(seller1.address);
      const now = await time.latest();
      await warrantyCheck
        .connect(seller1)
        .registerProduct(productId, productName, now, warrantyDuration, "ipfs://v1");
    });

    it("should allow registering seller to update name and metadata", async function () {
      await expect(
        warrantyCheck
          .connect(seller1)
          .updateProductInfo(productId, "Bose QuietComfort 45 (Updated)", "ipfs://v2")
      ).to.emit(warrantyCheck, "ProductInfoUpdated");

      const verified = await warrantyCheck.verifyProduct(productId);
      expect(verified.productName).to.equal("Bose QuietComfort 45 (Updated)");
      expect(verified.metadataURI).to.equal("ipfs://v2");
      // Original warranty duration & purchase date remain unchanged
      expect(verified.warrantyDuration).to.equal(warrantyDuration);
    });

    it("should prevent unauthorized parties from updating product info", async function () {
      await expect(
        warrantyCheck
          .connect(unauthorizedUser)
          .updateProductInfo(productId, "Tampered Name", "ipfs://tampered")
      ).to.be.revertedWith("WarrantyCheck: only admin or registering business can update");
    });
  });
});

