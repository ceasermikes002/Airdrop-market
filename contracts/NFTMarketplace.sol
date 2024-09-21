// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract NFTMarketplace is ERC721URIStorage, Ownable {
    uint256 public tokenCounter;
    
    struct NFT {
        uint256 tokenId;
        address payable owner;
        uint256 price;
        bool listedForSale;
    }

    mapping(uint256 => NFT) public idToNFT;

    event NFTMinted(uint256 indexed tokenId, address owner, string tokenURI);
    event NFTListedForSale(uint256 indexed tokenId, uint256 price);
    event NFTSold(uint256 indexed tokenId, address newOwner, uint256 price);

    constructor() ERC721("NFT Marketplace", "NFTM") Ownable(msg.sender) {
        tokenCounter = 0;
    }

    function mintNFT(string memory tokenURI) public onlyOwner returns (uint256) {
        uint256 tokenId = tokenCounter;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);

        idToNFT[tokenId] = NFT(tokenId, payable(msg.sender), 0, false);

        emit NFTMinted(tokenId, msg.sender, tokenURI);
        
        tokenCounter++;
        return tokenId;
    }

    function listNFTForSale(uint256 tokenId, uint256 price) public {
        require(ownerOf(tokenId) == msg.sender, "You do not own this NFT");
        require(price > 0, "Price must be greater than zero");
        
        idToNFT[tokenId].price = price;
        idToNFT[tokenId].listedForSale = true;

        emit NFTListedForSale(tokenId, price);
    }

    function buyNFT(uint256 tokenId) public payable {
        NFT memory nft = idToNFT[tokenId];
        require(nft.listedForSale, "NFT is not for sale");
        require(msg.value == nft.price, "Incorrect value sent");

        address payable seller = nft.owner;

        _transfer(seller, msg.sender, tokenId);
        seller.transfer(msg.value);

        idToNFT[tokenId].owner = payable(msg.sender);
        idToNFT[tokenId].listedForSale = false;

        emit NFTSold(tokenId, msg.sender, nft.price);
    }

    function getNFTDetails(uint256 tokenId) public view returns (NFT memory) {
        return idToNFT[tokenId];
    }
}
