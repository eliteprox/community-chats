// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CommunityAccess
 * @dev Manages access control for community audio conference calls
 * Deployed on Arbitrum for low gas fees
 */
contract CommunityAccess is Ownable {
    
    // Events
    event ParticipantAdded(address indexed participant, uint256 timestamp);
    event ParticipantRemoved(address indexed participant, uint256 timestamp);
    event CommunityCreated(uint256 indexed communityId, address indexed owner, string name);
    event CommunityUpdated(uint256 indexed communityId, string name);
    
    // Structs
    struct Community {
        uint256 id;
        string name;
        string description;
        address owner;
        uint256 createdAt;
        bool isActive;
        mapping(address => bool) allowedParticipants;
        address[] participantList;
    }
    
    // State variables
    mapping(uint256 => Community) public communities;
    mapping(address => uint256[]) public userCommunities;
    uint256 public communityCount;
    
    // Global allowlist (for default access across all communities)
    mapping(address => bool) public globalAllowlist;
    address[] public globalParticipants;
    
    // Livepeer Service Registry integration
    address public constant LIVEPEER_SERVICE_REGISTRY = 0xC92d3A360b8f9e083bA64DE15d95Cf8180897431;
    mapping(uint256 => bool) public communityRequiresLivepeer;
    
    constructor() Ownable(msg.sender) {
        communityCount = 0;
    }
    
    /**
     * @dev Create a new community
     * @param name Name of the community
     * @param description Description of the community
     * @param requireLivepeerRegistration Whether to require Livepeer Service Registry
     * @return communityId The ID of the newly created community
     */
    function createCommunity(
        string memory name,
        string memory description,
        bool requireLivepeerRegistration
    ) external returns (uint256) {
        uint256 communityId = communityCount++;
        Community storage newCommunity = communities[communityId];
        
        newCommunity.id = communityId;
        newCommunity.name = name;
        newCommunity.description = description;
        newCommunity.owner = msg.sender;
        newCommunity.createdAt = block.timestamp;
        newCommunity.isActive = true;
        
        // Set Livepeer requirement
        communityRequiresLivepeer[communityId] = requireLivepeerRegistration;
        
        // Creator is automatically allowed
        newCommunity.allowedParticipants[msg.sender] = true;
        newCommunity.participantList.push(msg.sender);
        
        userCommunities[msg.sender].push(communityId);
        
        emit CommunityCreated(communityId, msg.sender, name);
        
        return communityId;
    }
    
    /**
     * @dev Add participant to a specific community
     * @param communityId The ID of the community
     * @param participant Address to add
     */
    function addParticipantToCommunity(
        uint256 communityId,
        address participant
    ) external {
        require(communityId < communityCount, "Community does not exist");
        Community storage community = communities[communityId];
        require(
            msg.sender == community.owner || msg.sender == owner(),
            "Only community owner or contract owner can add participants"
        );
        require(!community.allowedParticipants[participant], "Participant already added");
        
        community.allowedParticipants[participant] = true;
        community.participantList.push(participant);
        userCommunities[participant].push(communityId);
        
        emit ParticipantAdded(participant, block.timestamp);
    }
    
    /**
     * @dev Add multiple participants to a community at once
     * @param communityId The ID of the community
     * @param participants Array of addresses to add
     */
    function addParticipantsToCommunity(
        uint256 communityId,
        address[] memory participants
    ) external {
        require(communityId < communityCount, "Community does not exist");
        Community storage community = communities[communityId];
        require(
            msg.sender == community.owner || msg.sender == owner(),
            "Only community owner or contract owner can add participants"
        );
        
        for (uint256 i = 0; i < participants.length; i++) {
            address participant = participants[i];
            if (!community.allowedParticipants[participant]) {
                community.allowedParticipants[participant] = true;
                community.participantList.push(participant);
                userCommunities[participant].push(communityId);
                emit ParticipantAdded(participant, block.timestamp);
            }
        }
    }
    
    /**
     * @dev Remove participant from a community
     * @param communityId The ID of the community
     * @param participant Address to remove
     */
    function removeParticipantFromCommunity(
        uint256 communityId,
        address participant
    ) external {
        require(communityId < communityCount, "Community does not exist");
        Community storage community = communities[communityId];
        require(
            msg.sender == community.owner || msg.sender == owner(),
            "Only community owner or contract owner can remove participants"
        );
        require(community.allowedParticipants[participant], "Participant not in community");
        
        community.allowedParticipants[participant] = false;
        
        // Remove from participant list
        for (uint256 i = 0; i < community.participantList.length; i++) {
            if (community.participantList[i] == participant) {
                community.participantList[i] = community.participantList[
                    community.participantList.length - 1
                ];
                community.participantList.pop();
                break;
            }
        }
        
        emit ParticipantRemoved(participant, block.timestamp);
    }
    
    /**
     * @dev Check if an address can access a community
     * @param communityId The ID of the community
     * @param participant Address to check
     * @return bool True if participant has access
     */
    function hasAccess(
        uint256 communityId,
        address participant
    ) external view returns (bool) {
        require(communityId < communityCount, "Community does not exist");
        Community storage community = communities[communityId];
        
        // Check community-specific access or global allowlist
        bool hasDirectAccess = community.allowedParticipants[participant] || 
                               globalAllowlist[participant];
        
        // If Livepeer registration is required, check the Service Registry
        if (communityRequiresLivepeer[communityId]) {
            return hasDirectAccess || isRegisteredInLivepeer(participant);
        }
        
        return hasDirectAccess;
    }
    
    /**
     * @dev Check if an address is registered in Livepeer Service Registry
     * @param addr Address to check
     * @return bool True if registered
     */
    function isRegisteredInLivepeer(address addr) public view returns (bool) {
        // Call the ServiceRegistry to check if serviceURI is set
        (bool success, bytes memory data) = LIVEPEER_SERVICE_REGISTRY.staticcall(
            abi.encodeWithSignature("getServiceURI(address)", addr)
        );
        
        if (!success) {
            return false;
        }
        
        // Decode the returned string
        string memory serviceURI = abi.decode(data, (string));
        
        // If serviceURI has length > 0, the address is registered
        return bytes(serviceURI).length > 0;
    }
    
    /**
     * @dev Get all participants in a community
     * @param communityId The ID of the community
     * @return address[] Array of participant addresses
     */
    function getCommunityParticipants(
        uint256 communityId
    ) external view returns (address[] memory) {
        require(communityId < communityCount, "Community does not exist");
        return communities[communityId].participantList;
    }
    
    /**
     * @dev Get community information
     * @param communityId The ID of the community
     */
    function getCommunityInfo(
        uint256 communityId
    ) external view returns (
        string memory name,
        string memory description,
        address communityOwner,
        uint256 createdAt,
        bool isActive,
        uint256 participantCount
    ) {
        require(communityId < communityCount, "Community does not exist");
        Community storage community = communities[communityId];
        
        return (
            community.name,
            community.description,
            community.owner,
            community.createdAt,
            community.isActive,
            community.participantList.length
        );
    }
    
    /**
     * @dev Get all communities a user belongs to
     * @param user Address to check
     */
    function getUserCommunities(
        address user
    ) external view returns (uint256[] memory) {
        return userCommunities[user];
    }
    
    /**
     * @dev Add address to global allowlist (contract owner only)
     * @param participant Address to add
     */
    function addToGlobalAllowlist(address participant) external onlyOwner {
        require(!globalAllowlist[participant], "Already in global allowlist");
        
        globalAllowlist[participant] = true;
        globalParticipants.push(participant);
        
        emit ParticipantAdded(participant, block.timestamp);
    }
    
    /**
     * @dev Remove address from global allowlist (contract owner only)
     * @param participant Address to remove
     */
    function removeFromGlobalAllowlist(address participant) external onlyOwner {
        require(globalAllowlist[participant], "Not in global allowlist");
        
        globalAllowlist[participant] = false;
        
        // Remove from global participants list
        for (uint256 i = 0; i < globalParticipants.length; i++) {
            if (globalParticipants[i] == participant) {
                globalParticipants[i] = globalParticipants[globalParticipants.length - 1];
                globalParticipants.pop();
                break;
            }
        }
        
        emit ParticipantRemoved(participant, block.timestamp);
    }
    
    /**
     * @dev Get all global participants
     */
    function getGlobalParticipants() external view returns (address[] memory) {
        return globalParticipants;
    }
    
    /**
     * @dev Update community information
     * @param communityId The ID of the community
     * @param name New name
     * @param description New description
     */
    function updateCommunity(
        uint256 communityId,
        string memory name,
        string memory description
    ) external {
        require(communityId < communityCount, "Community does not exist");
        Community storage community = communities[communityId];
        require(
            msg.sender == community.owner,
            "Only community owner can update"
        );
        
        community.name = name;
        community.description = description;
        
        emit CommunityUpdated(communityId, name);
    }
    
    /**
     * @dev Deactivate a community
     * @param communityId The ID of the community
     */
    function deactivateCommunity(uint256 communityId) external {
        require(communityId < communityCount, "Community does not exist");
        Community storage community = communities[communityId];
        require(
            msg.sender == community.owner || msg.sender == owner(),
            "Only community owner or contract owner can deactivate"
        );
        
        community.isActive = false;
    }
}

