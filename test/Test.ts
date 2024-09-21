import { ethers } from "hardhat";
import { expect } from "chai";

describe("NFTMarketplace", function () {
  let nftMarketplace: any;
  let owner: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async function () {
    // Get the contract factory and signers
    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract
    nftMarketplace = await NFTMarketplace.deploy();
    await nftMarketplace.waitForDeployment();
  });

  describe("Buy NFT functionality", function () {
    let tokenId: number;
    let listingPrice: any;

    beforeEach(async function () {
      // Mint an NFT from the contract owner
      const mintTx = await nftMarketplace.mintNFT("ipfs://tokenURI");
      await mintTx.wait();
      tokenId = 0; // Since it's the first minted NFT, its tokenId will be 0

      // List the NFT for sale
      listingPrice = ethers.parseEther("1"); // List for 1 ether
      await nftMarketplace.listNFTForSale(tokenId, listingPrice);
    });

    it("Should allow a user to buy a listed NFT", async function () {
      // Ensure addr1 can buy the NFT by sending the correct value
      await expect(
        nftMarketplace.connect(addr1).buyNFT(tokenId, { value: listingPrice })
      ).to.emit(nftMarketplace, "NFTSold")
        .withArgs(tokenId, addr1.address, listingPrice);

      // Check that the new owner of the NFT is addr1
      expect(await nftMarketplace.ownerOf(tokenId)).to.equal(addr1.address);
    });

    it("Should revert if the NFT is not listed for sale", async function () {
      // Unlist the NFT by marking it as sold
      await nftMarketplace.connect(addr1).buyNFT(tokenId, { value: listingPrice });

      // addr2 tries to buy the already sold NFT
      await expect(
        nftMarketplace.connect(addr2).buyNFT(tokenId, { value: listingPrice })
      ).to.be.revertedWith("NFT is not for sale");
    });

    it("Should revert if the buyer sends incorrect payment amount", async function () {
      const incorrectPrice = ethers.parseEther("0.5"); // Sending 0.5 ether instead of 1

      await expect(
        nftMarketplace.connect(addr1).buyNFT(tokenId, { value: incorrectPrice })
      ).to.be.revertedWith("Incorrect value sent");
    });

    it("Should transfer ownership and funds correctly", async function () {
      // addr1 buys the NFT
      const initialSellerBalance:any = await ethers.provider.getBalance(owner.address);

      const buyTx = await nftMarketplace.connect(addr1).buyNFT(tokenId, { value: listingPrice });
      const buyTxReceipt = await buyTx.wait();
      const gasUsed = buyTxReceipt.gasUsed.mul(buyTxReceipt.effectiveGasPrice);

      // Verify ownership of the NFT has changed
      expect(await nftMarketplace.ownerOf(tokenId)).to.equal(addr1.address);

      // Verify funds have been transferred to the seller (owner)
      const finalSellerBalance:any = await ethers.provider.getBalance(owner.address);
      expect(finalSellerBalance).to.equal(initialSellerBalance.add(listingPrice));
    });

    it("Should revert if someone other than the owner lists the NFT", async function () {
      // addr1 tries to list the NFT they don't own
      await expect(
        nftMarketplace.connect(addr1).listNFTForSale(tokenId, listingPrice)
      ).to.be.revertedWith("You do not own this NFT");
    });
  });
});
