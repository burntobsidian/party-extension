import { ReconnectingWebSocket } from "./partyserver-chunk-YV734IKE.mjs";

// src/index.ts
var valueIsNotNil = (keyValuePair) => keyValuePair[1] !== null && keyValuePair[1] !== void 0;
function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  let d = /* @__PURE__ */ new Date().getTime();
  let d2 = (typeof performance !== "undefined" && performance.now && performance.now() * 1e3) || 0;
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    let r = Math.random() * 16;
    if (d > 0) {
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === "x" ? r : (r & 3) | 8).toString(16);
  });
}
function getPartyInfo(partySocketOptions, defaultProtocol, defaultParams = {}) {
  const {
    host: rawHost,
    path: rawPath,
    protocol: rawProtocol,
    room,
    party,
    query,
  } = partySocketOptions;
  let host = rawHost.replace(/^(http|https|ws|wss):\/\//, "");
  if (host.endsWith("/")) {
    host = host.slice(0, -1);
  }
  if (rawPath && rawPath.startsWith("/")) {
    throw new Error("path must not start with a slash");
  }
  const name = party ?? "main";
  const path = rawPath ? `/${rawPath}` : "";
  const protocol =
    rawProtocol ||
    (host.startsWith("localhost:") || host.startsWith("127.0.0.1:")
      ? // http / ws
        defaultProtocol
      : // https / wss
        defaultProtocol + "s");
  const baseUrl = `${protocol}://${host}/${party ? `parties/${party}` : "party"}/${room}${path}`;
  const makeUrl = (query2 = {}) =>
    `${baseUrl}?${new URLSearchParams([
      ...Object.entries(defaultParams),
      ...Object.entries(query2).filter(valueIsNotNil),
    ])}`;
  const urlProvider =
    typeof query === "function" ? async () => makeUrl(await query()) : makeUrl(query);
  return {
    host,
    path,
    room,
    name,
    protocol,
    partyUrl: baseUrl,
    urlProvider,
  };
}
var PartySocket = class extends ReconnectingWebSocket {
  constructor(partySocketOptions) {
    const {
      id,
      host: _host,
      path: _path,
      party: _party,
      room: _room,
      protocol: _protocol,
      query: _query,
      protocols,
      ...socketOptions
    } = partySocketOptions;
    const _pk = id || generateUUID();
    const party = getPartyInfo(partySocketOptions, "ws", { _pk });
    super(party.urlProvider, protocols, socketOptions);
    this.partySocketOptions = partySocketOptions;
    this._pk = _pk;
    this._pkurl = party.partyUrl;
    this.name = party.name;
    this.room = party.room;
    this.host = party.host;
    this.path = party.path;
  }
  _pk;
  _pkurl;
  name;
  room;
  host;
  path;
  get id() {
    return this._pk;
  }
  /**
   * Exposes the static PartyKit room URL without applying query parameters.
   * To access the currently connected WebSocket url, use PartySocket#url.
   */
  get roomUrl() {
    return this._pkurl;
  }
  // a `fetch` method that uses (almost) the same options as `PartySocket`
  static async fetch(options, init) {
    const party = getPartyInfo(options, "http");
    const url =
      typeof party.urlProvider === "string" ? party.urlProvider : await party.urlProvider();
    const doFetch = options.fetch ?? fetch;
    return doFetch(url, init);
  }
};

export { PartySocket };
