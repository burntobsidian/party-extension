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
    // conn.setState()
    // let's send a message to the connection
    // conn.send("hello from server");
  }

  onMessage(message: string, sender: Party.Connection) {
    // if (sender.state && "hostname" in sender.state && message === sender.state.hostname) return;

    if (message === "keepalive") {
      console.log(message, sender.id, new Date().getSeconds());

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
      // console.log(sender.state.hostname);
      previousHostname = sender.state.hostname;
      previousLiveMembers = this.partyMembers[previousHostname] - 1;
      this.partyMembers[previousHostname] = previousLiveMembers;
    }

    sender.setState({ hostname: message });
    // let's log the message
    // console.log(`connection ${sender.id} sent message: ${message}`);
    // as well as broadcast it to all the other connections in the room...
    console.log([...this.party.getConnections()].length);

    for (const connection of this.party.getConnections()) {
      console.log("state", connection.state);

      if (
        connection.state &&
        "hostname" in connection.state &&
        connection.state.hostname === previousHostname
      ) {
        console.log("conns", connection, previousLiveMembers);
        connection.send(String(previousLiveMembers));
      } else if (
        connection.state &&
        "hostname" in connection.state &&
        connection.state.hostname === message
      ) {
        console.log("conns", connection, liveMembers);
        connection.send(String(liveMembers));
      }
    }

    console.log(this.partyMembers);
  }

  onClose(connection: Party.Connection<unknown>): void | Promise<void> {
    console.log("closing connection", connection.id);
  }

  onError(connection: Party.Connection<unknown>, error: Error): void | Promise<void> {
    console.log("logging error", connection.id);
  }
}

Server satisfies Party.Worker;
