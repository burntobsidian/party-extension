import { PartySocket } from "./partyserver-chunk-FTDRUZ5U.mjs";

const PARTYKIT_HOST = "https://party-members.burntobsidian.partykit.dev/";

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
let previousPartySocketCallback;

const tabUpdateHandler = (tabId, url) => {
  const { hostname } = new URL(url);

  if (!partySocket) {
    connect();
  }

  if (previousTabId !== tabId) {
    partySocket.removeEventListener("message", previousPartySocketCallback);
    const newPartySocketCallback = async (event) => {
      try {
        await chrome.action.setBadgeText({
          tabId,
          text: event.data,
        });
      } catch (err) {
        console.log(err);
      }
    };
    partySocket.addEventListener("message", newPartySocketCallback);
    previousTabId = tabId;
    previousPartySocketCallback = newPartySocketCallback;
  }

  partySocket.send(hostname);
};

chrome.runtime.onSuspend.addListener(() => {
  disconnect();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.active || changeInfo.status !== "complete") return;

  tabUpdateHandler(tabId, tab.url);
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  if (!tab.active || !tab.url) return;

  tabUpdateHandler(tabId, tab.url);
});
