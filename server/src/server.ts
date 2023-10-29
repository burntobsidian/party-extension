import type * as Party from "partykit/server";

export default class Server implements Party.Server {
  partyMembers: Record<string, number> = {};

  constructor(readonly party: Party.Party) {}

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // A websocket just connected!
    console.log(
      `Connected:
  id: ${conn.id}
  room: ${this.party.id}
  url: ${new URL(ctx.request.url).pathname}`
    );
  }

  onMessage(message: string, sender: Party.Connection) {
    if (message === "keepalive") {
      return;
    }

    const senderPreviousHostname = this.validateHostname(sender);
    if (!senderPreviousHostname.success) return;

    if (senderPreviousHostname.data === message) {
      sender.send(String(this.partyMembers[message]));
      return;
    }

    const newHostnameLiveMembers = this.addMember(message);
    const previousHostnameLiveMembers = this.removeMember(senderPreviousHostname.data);

    sender.setState({ hostname: message });

    this.broadcast((conn) => {
      const connHostname = this.validateHostname(conn);
      if (!connHostname.success) return;
      if (connHostname.data === senderPreviousHostname.data) return previousHostnameLiveMembers;
      if (connHostname.data === message) return newHostnameLiveMembers;
    });
  }

  onClose(sender: Party.Connection<unknown>): void | Promise<void> {
    console.log("closing connection", sender.id);

    const senderHostname = this.validateHostname(sender);
    if (!senderHostname.success) return;

    const remainingMembers = this.removeMember(senderHostname.data);

    this.broadcast((conn) => {
      const connHostname = this.validateHostname(conn);
      if (connHostname.success && connHostname.data === senderHostname.data) {
        return remainingMembers;
      }
    });
  }

  onError(sender: Party.Connection<unknown>, error: Error): void | Promise<void> {
    console.log("logging error", sender.id);

    const senderHostname = this.validateHostname(sender);
    if (!senderHostname.success) return;

    const remainingMembers = this.removeMember(senderHostname.data);

    this.broadcast((conn) => {
      const connHostname = this.validateHostname(conn);
      if (connHostname.success && connHostname.data === senderHostname.data) {
        return remainingMembers;
      }
    });
  }

  removeMember(hostname: string): number {
    const remainingMembers = this.partyMembers[hostname] - 1;
    this.partyMembers[hostname] = remainingMembers;
    return remainingMembers;
  }

  addMember(hostname: string): number {
    const liveMembers = (this.partyMembers[hostname] ?? 0) + 1;
    this.partyMembers[hostname] = liveMembers;
    return liveMembers;
  }

  broadcast(callback: (connection: Party.Connection<unknown>) => number | undefined) {
    for (const conn of this.party.getConnections()) {
      const members = callback(conn);
      if (members !== undefined) {
        conn.send(String(members));
      }
    }
  }

  validateHostname(
    connection: Party.Connection<unknown>
  ): { success: true; data: string } | { success: false } {
    if (
      !!connection.state &&
      "hostname" in connection.state &&
      typeof connection.state.hostname === "string"
    ) {
      return { success: true, data: connection.state.hostname };
    } else {
      return { success: false };
    }
  }
}

Server satisfies Party.Worker;
