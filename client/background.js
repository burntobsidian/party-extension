import { PartySocket } from "./partyserver-chunk-FTDRUZ5U.mjs";

const PARTYKIT_HOST = "http://127.0.0.1:1999/";

let partySocket;

const connect = () => {
  disconnect();

  partySocket = new PartySocket({
    host: PARTYKIT_HOST,
    room: "party-members",
  });

  let keepAliveIntervalId;

  const keepAlive = () => {
    clearInterval(keepAliveIntervalId);
    keepAliveIntervalId = setInterval(
      () => {
        if (partySocket) {
          partySocket.send("keepalive");
        } else {
          clearInterval(keepAliveIntervalId);
        }
      },
      // Set the interval to 20 seconds to prevent the service worker from becoming inactive.
      20 * 1000
    );
  };

  partySocket.addEventListener("open", () => {
    keepAlive();
  });

  return partySocket;
};

const disconnect = () => {
  if (partySocket == null) {
    return;
  }
  partySocket.close();
};

let previousTabId;

chrome.webNavigation.onCompleted.addListener(async ({ tabId, url, frameId }) => {
  if (frameId !== 0) return;

  const { hostname } = new URL(url);

  if (!partySocket) {
    connect();
  }

  if (previousTabId !== tabId) {
    partySocket.addEventListener("message", async (event) => {
      await chrome.action.setBadgeText({
        tabId,
        text: event.data,
      });
    });
    previousTabId = tabId;
  }

  partySocket.send(hostname);
});

chrome.runtime.onSuspend.addListener(() => {
  disconnect();
});
