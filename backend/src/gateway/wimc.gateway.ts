import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : true,
    credentials: true,
  },
})
export class WimcGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, string[]>();

  constructor(private readonly authService: AuthService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      if (!token) { client.disconnect(); return; }

      const user = await this.authService.validateToken(token);
      const profile = await this.authService.getProfile(user.id);
      client.data.user = { ...user, ...profile };

      // Join personal room
      client.join(`user:${user.id}`);

      // Join role room
      if (profile.role === 'admin') client.join('admin');
      if (['customer', 'celebrity'].includes(profile.role)) client.join('sellers');

      // Track socket (limit to 5 connections per user to prevent resource exhaustion)
      const existing = this.userSockets.get(user.id) || [];
      if (existing.length >= 5) {
        client.disconnect();
        return;
      }
      this.userSockets.set(user.id, [...existing, client.id]);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.user) {
      const userId = client.data.user.id;
      const sockets = (this.userSockets.get(userId) || []).filter(id => id !== client.id);
      if (sockets.length === 0) this.userSockets.delete(userId);
      else this.userSockets.set(userId, sockets);
    }
  }

  // Emit helpers
  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  emitToAdmin(event: string, data: any) {
    this.server.to('admin').emit(event, data);
  }

  emitToSellers(event: string, data: any) {
    this.server.to('sellers').emit(event, data);
  }

  emitToAuction(auctionId: string, event: string, data: any) {
    this.server.to(`auction:${auctionId}`).emit(event, data);
  }

  @SubscribeMessage('auction:join')
  handleAuctionJoin(client: Socket, auctionId: string) {
    client.join(`auction:${auctionId}`);
  }

  @SubscribeMessage('auction:leave')
  handleAuctionLeave(client: Socket, auctionId: string) {
    client.leave(`auction:${auctionId}`);
  }
}
