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

    if (sender.state && "hostname" in sender.state && sender.state.hostname === message) {
      sender.send(String(this.partyMembers[message]));
      return;
    }

    const liveMembers = (this.partyMembers[message] ?? 0) + 1;
    this.partyMembers[message] = liveMembers;

    let previousHostname;
    let previousLiveMembers;
    if (sender.state && "hostname" in sender.state && typeof sender.state.hostname === "string") {
      previousHostname = sender.state.hostname;
      previousLiveMembers = this.partyMembers[previousHostname] - 1;
      this.partyMembers[previousHostname] = previousLiveMembers;
    }

    sender.setState({ hostname: message });

    for (const connection of this.party.getConnections()) {
      if (!(connection.state && "hostname" in connection.state)) return;

      if (connection.state.hostname === previousHostname) {
        connection.send(String(previousLiveMembers));
      } else if (connection.state.hostname === message) {
        connection.send(String(liveMembers));
      }
    }
  }

  onClose(connection: Party.Connection<unknown>): void | Promise<void> {
    console.log("closing connection", connection.id);
  }

  onError(connection: Party.Connection<unknown>, error: Error): void | Promise<void> {
    console.log("logging error", connection.id);
  }
}

Server satisfies Party.Worker;
