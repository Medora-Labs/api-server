import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';

interface MeetingParticipant {
  id: string;
  ws: WebSocket;
  displayName: string;
}

interface Meeting {
  id: string;
  participants: Map<string, MeetingParticipant>;
}

class WebSocketService {
  private wss: WebSocketServer;
  private meetings: Map<string, Meeting>;

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ server });
    this.meetings = new Map();

    this.wss.on('connection', (ws: WebSocket, req) => {
      const url = parse(req.url || '', true);
      const pathSegments = url.pathname?.split('/') || [];
      const meetingId = pathSegments[pathSegments.length - 1];
      const participantId = Math.random().toString(36).substring(7);

      if (!meetingId) {
        ws.close();
        return;
      }

      this.handleConnection(ws, meetingId, participantId);
    });
  }

  private handleConnection(ws: WebSocket, meetingId: string, participantId: string) {
    // Initialize meeting if it doesn't exist
    if (!this.meetings.has(meetingId)) {
      this.meetings.set(meetingId, {
        id: meetingId,
        participants: new Map(),
      });
    }

    const meeting = this.meetings.get(meetingId)!;

    // Add participant to meeting
    meeting.participants.set(participantId, {
      id: participantId,
      ws,
      displayName: '', // Will be set when client sends it
    });

    // Notify existing participants about the new peer
    meeting.participants.forEach((participant, pid) => {
      if (pid !== participantId) {
        participant.ws.send(JSON.stringify({
          type: 'new-peer',
          peerId: participantId,
        }));
      }
    });

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleMessage(meetingId, participantId, data);
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      this.handleDisconnection(meetingId, participantId);
    });
  }

  private handleMessage(meetingId: string, senderId: string, data: any) {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return;

    const sender = meeting.participants.get(senderId);
    if (!sender) return;

    switch (data.type) {
      case 'set-display-name':
        sender.displayName = data.displayName;
        // Notify others about the display name
        this.broadcastToMeeting(meetingId, {
          type: 'peer-name-update',
          peerId: senderId,
          displayName: data.displayName,
        }, [senderId]);
        break;

      case 'offer':
      case 'answer':
      case 'ice-candidate':
        const { peerId } = data;
        const peer = meeting.participants.get(peerId);
        if (peer) {
          peer.ws.send(JSON.stringify({
            ...data,
            peerId: senderId,
          }));
        }
        break;
    }
  }

  private handleDisconnection(meetingId: string, participantId: string) {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return;

    // Remove participant
    meeting.participants.delete(participantId);

    // Notify others about the peer leaving
    this.broadcastToMeeting(meetingId, {
      type: 'peer-left',
      peerId: participantId,
    });

    // Clean up empty meeting
    if (meeting.participants.size === 0) {
      this.meetings.delete(meetingId);
    }
  }

  private broadcastToMeeting(meetingId: string, data: any, excludeIds: string[] = []) {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return;

    const message = JSON.stringify(data);
    meeting.participants.forEach((participant, pid) => {
      if (!excludeIds.includes(pid)) {
        participant.ws.send(message);
      }
    });
  }
}

export default WebSocketService; 