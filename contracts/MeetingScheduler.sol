// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MeetingScheduler
 * @dev Manages scheduled meetings for community audio conference calls
 * Deployed on Arbitrum for low gas fees and fast finality
 */
contract MeetingScheduler is Ownable {
    
    // Events
    event MeetingCreated(
        uint256 indexed meetingId,
        uint256 indexed communityId,
        address indexed host,
        string title,
        uint256 scheduledTime
    );
    event MeetingUpdated(uint256 indexed meetingId, string title);
    event MeetingStatusChanged(uint256 indexed meetingId, MeetingStatus status);
    event MeetingDeleted(uint256 indexed meetingId);
    event ParticipantJoined(uint256 indexed meetingId, address indexed participant);
    
    // Enums
    enum MeetingStatus {
        Scheduled,
        Live,
        Ended,
        Cancelled
    }
    
    // Structs
    struct Meeting {
        uint256 id;
        uint256 communityId;
        string title;
        string description;
        uint256 scheduledTime;
        uint256 duration; // in minutes
        address host;
        string whipUrl;
        string rtmpUrl;
        bool isRecording;
        MeetingStatus status;
        uint256 createdAt;
        address[] participants;
    }
    
    // State variables
    mapping(uint256 => Meeting) public meetings;
    mapping(uint256 => mapping(address => bool)) public meetingParticipants;
    mapping(uint256 => uint256[]) public communityMeetings; // communityId => meetingIds
    mapping(address => uint256[]) public hostMeetings; // host => meetingIds
    uint256 public meetingCount;
    
    constructor() Ownable(msg.sender) {
        meetingCount = 0;
    }
    
    /**
     * @dev Create a new meeting
     * @param communityId The community this meeting belongs to
     * @param title Meeting title
     * @param description Meeting description
     * @param scheduledTime Unix timestamp of when the meeting is scheduled
     * @param duration Duration in minutes
     * @param whipUrl Optional WHIP URL for recording
     * @param rtmpUrl Optional RTMP URL for streaming
     * @return meetingId The ID of the newly created meeting
     */
    function createMeeting(
        uint256 communityId,
        string memory title,
        string memory description,
        uint256 scheduledTime,
        uint256 duration,
        string memory whipUrl,
        string memory rtmpUrl
    ) external returns (uint256) {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(scheduledTime > block.timestamp, "Scheduled time must be in the future");
        require(duration > 0, "Duration must be greater than 0");
        
        uint256 meetingId = meetingCount++;
        Meeting storage newMeeting = meetings[meetingId];
        
        newMeeting.id = meetingId;
        newMeeting.communityId = communityId;
        newMeeting.title = title;
        newMeeting.description = description;
        newMeeting.scheduledTime = scheduledTime;
        newMeeting.duration = duration;
        newMeeting.host = msg.sender;
        newMeeting.whipUrl = whipUrl;
        newMeeting.rtmpUrl = rtmpUrl;
        newMeeting.isRecording = bytes(whipUrl).length > 0 || bytes(rtmpUrl).length > 0;
        newMeeting.status = MeetingStatus.Scheduled;
        newMeeting.createdAt = block.timestamp;
        
        // Add host as first participant
        newMeeting.participants.push(msg.sender);
        meetingParticipants[meetingId][msg.sender] = true;
        
        // Track meeting relationships
        communityMeetings[communityId].push(meetingId);
        hostMeetings[msg.sender].push(meetingId);
        
        emit MeetingCreated(meetingId, communityId, msg.sender, title, scheduledTime);
        
        return meetingId;
    }
    
    /**
     * @dev Update meeting details
     * @param meetingId The ID of the meeting to update
     * @param title New title
     * @param description New description
     * @param scheduledTime New scheduled time
     * @param duration New duration
     * @param whipUrl New WHIP URL
     * @param rtmpUrl New RTMP URL
     */
    function updateMeeting(
        uint256 meetingId,
        string memory title,
        string memory description,
        uint256 scheduledTime,
        uint256 duration,
        string memory whipUrl,
        string memory rtmpUrl
    ) external {
        require(meetingId < meetingCount, "Meeting does not exist");
        Meeting storage meeting = meetings[meetingId];
        require(msg.sender == meeting.host, "Only host can update meeting");
        require(meeting.status == MeetingStatus.Scheduled, "Can only update scheduled meetings");
        require(bytes(title).length > 0, "Title cannot be empty");
        require(scheduledTime > block.timestamp, "Scheduled time must be in the future");
        
        meeting.title = title;
        meeting.description = description;
        meeting.scheduledTime = scheduledTime;
        meeting.duration = duration;
        meeting.whipUrl = whipUrl;
        meeting.rtmpUrl = rtmpUrl;
        meeting.isRecording = bytes(whipUrl).length > 0 || bytes(rtmpUrl).length > 0;
        
        emit MeetingUpdated(meetingId, title);
    }
    
    /**
     * @dev Change meeting status
     * @param meetingId The ID of the meeting
     * @param newStatus The new status
     */
    function changeMeetingStatus(
        uint256 meetingId,
        MeetingStatus newStatus
    ) external {
        require(meetingId < meetingCount, "Meeting does not exist");
        Meeting storage meeting = meetings[meetingId];
        require(msg.sender == meeting.host, "Only host can change status");
        
        meeting.status = newStatus;
        emit MeetingStatusChanged(meetingId, newStatus);
    }
    
    /**
     * @dev Delete a meeting (only host or contract owner)
     * @param meetingId The ID of the meeting to delete
     */
    function deleteMeeting(uint256 meetingId) external {
        require(meetingId < meetingCount, "Meeting does not exist");
        Meeting storage meeting = meetings[meetingId];
        require(
            msg.sender == meeting.host || msg.sender == owner(),
            "Only host or owner can delete meeting"
        );
        
        // Mark as cancelled instead of actually deleting (for historical records)
        meeting.status = MeetingStatus.Cancelled;
        emit MeetingDeleted(meetingId);
    }
    
    /**
     * @dev Join a meeting as a participant
     * @param meetingId The ID of the meeting to join
     */
    function joinMeeting(uint256 meetingId) external {
        require(meetingId < meetingCount, "Meeting does not exist");
        Meeting storage meeting = meetings[meetingId];
        require(
            meeting.status == MeetingStatus.Scheduled || meeting.status == MeetingStatus.Live,
            "Meeting is not available to join"
        );
        require(!meetingParticipants[meetingId][msg.sender], "Already joined this meeting");
        
        meeting.participants.push(msg.sender);
        meetingParticipants[meetingId][msg.sender] = true;
        
        emit ParticipantJoined(meetingId, msg.sender);
    }
    
    /**
     * @dev Get meeting details
     * @param meetingId The ID of the meeting
     */
    function getMeeting(uint256 meetingId) external view returns (
        uint256 id,
        uint256 communityId,
        string memory title,
        string memory description,
        uint256 scheduledTime,
        uint256 duration,
        address host,
        string memory whipUrl,
        string memory rtmpUrl,
        bool isRecording,
        MeetingStatus status,
        uint256 createdAt,
        uint256 participantCount
    ) {
        require(meetingId < meetingCount, "Meeting does not exist");
        Meeting storage meeting = meetings[meetingId];
        
        return (
            meeting.id,
            meeting.communityId,
            meeting.title,
            meeting.description,
            meeting.scheduledTime,
            meeting.duration,
            meeting.host,
            meeting.whipUrl,
            meeting.rtmpUrl,
            meeting.isRecording,
            meeting.status,
            meeting.createdAt,
            meeting.participants.length
        );
    }
    
    /**
     * @dev Get all participants of a meeting
     * @param meetingId The ID of the meeting
     */
    function getMeetingParticipants(uint256 meetingId) external view returns (address[] memory) {
        require(meetingId < meetingCount, "Meeting does not exist");
        return meetings[meetingId].participants;
    }
    
    /**
     * @dev Get all meetings for a community
     * @param communityId The ID of the community
     */
    function getCommunityMeetings(uint256 communityId) external view returns (uint256[] memory) {
        return communityMeetings[communityId];
    }
    
    /**
     * @dev Get all meetings hosted by an address
     * @param host The address of the host
     */
    function getHostMeetings(address host) external view returns (uint256[] memory) {
        return hostMeetings[host];
    }
    
    /**
     * @dev Get upcoming meetings for a community (not ended/cancelled)
     * @param communityId The ID of the community
     * @param limit Maximum number of meetings to return
     */
    function getUpcomingCommunityMeetings(
        uint256 communityId,
        uint256 limit
    ) external view returns (uint256[] memory) {
        uint256[] memory allMeetings = communityMeetings[communityId];
        uint256[] memory upcoming = new uint256[](allMeetings.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < allMeetings.length && count < limit; i++) {
            uint256 meetingId = allMeetings[i];
            Meeting storage meeting = meetings[meetingId];
            
            if (
                (meeting.status == MeetingStatus.Scheduled || meeting.status == MeetingStatus.Live) &&
                meeting.scheduledTime >= block.timestamp
            ) {
                upcoming[count] = meetingId;
                count++;
            }
        }
        
        // Resize array to actual count
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = upcoming[i];
        }
        
        return result;
    }
    
    /**
     * @dev Check if an address is a participant in a meeting
     * @param meetingId The ID of the meeting
     * @param participant The address to check
     */
    function isParticipant(
        uint256 meetingId,
        address participant
    ) external view returns (bool) {
        require(meetingId < meetingCount, "Meeting does not exist");
        return meetingParticipants[meetingId][participant];
    }
}

