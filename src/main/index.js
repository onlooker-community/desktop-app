// Main process entry point.
// Owns: BrowserWindow lifecycle, system tray, IPC handler registration.
// All Node/filesystem/shell work is delegated to the other main/ modules.

import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import Store from "electron-store";

import { IPC, DEFAULT_SETTINGS } from "../shared/ipc-channels.js";
import { registerChatHandlers } from "./claude-client.js";
import { registerLogHandlers, stopAllWatchers } from "./log-watcher.js";
import { registerPluginHandlers } from "./plugin-bridge.js";
import { registerKeyHandlers } from "./key-manager.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === "development";

// Persistent settings written to Electron's userData dir (not ~/.claude/onlooker)
export const store = new Store({ defaults: DEFAULT_SETTINGS });

let mainWindow = null;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: "hiddenInset",        // macOS: inset traffic lights
    trafficLightPosition: { x: 14, y: 14 },
    backgroundColor: "#0b0d14",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"), // CJS because contextBridge uses require()
      contextIsolation: true,   // renderer never gets Node access
      nodeIntegration: false,
      sandbox: false,           // preload needs require()
    },
    icon: path.join(__dirname, "../../assets/icon.png"),
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../dist/renderer/index.html"));
  }

  mainWindow.on("closed", () => { mainWindow = null; });
}

function createTray() {
  const iconPath = path.join(__dirname, "../../assets/tray-icon.png");
  try {
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    tray = new Tray(icon);
    tray.setToolTip("Onlooker");
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: "Open Onlooker", click: () => mainWindow?.show() ?? createWindow() },
      { label: "Weekly Review", click: () => mainWindow?.webContents.send(IPC.REVIEW_REQUEST, {}) },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() },
    ]));
    tray.on("click", () => mainWindow?.show());
  } catch {
    // Tray icon asset missing during dev — non-fatal
    console.warn("Tray icon not found, skipping tray");
  }
}

function registerWindowHandlers() {
  ipcMain.on(IPC.WINDOW_MINIMIZE, () => mainWindow?.minimize());
  ipcMain.on(IPC.WINDOW_MAXIMIZE, () => {
    mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize();
  });
  ipcMain.on(IPC.WINDOW_CLOSE, () => mainWindow?.close());
}

// ── Native notifications for high-severity events ───────────────────────────
// Listens for forwarded log events and fires native notifications for blocks,
// tribunal failures, budget alerts, and instruction health degradation.
// Rate-limited: max 1 notification per type per 30 seconds.
const notifTimestamps = {};

function maybeNotify(event) {
  if (!Notification.isSupported()) return;

  let title = null;
  let body = null;
  let key = null;

  // Warden block
  if (event.plugin === "warden" && event.status === "block") {
    key = "warden-block";
    title = "Warden blocked an injection attempt";
    const target = event.meta?.target ?? event.meta?.file ?? "";
    const category = event.meta?.pattern_matched ?? "prompt injection";
    body = `Category: ${category}${target ? ` | File: ${target.split("/").pop()}` : ""}`;
  }

  // Tribunal failure
  if (event.plugin === "tribunal" && (event.status === "fail" || event.status === "warn")) {
    const score = event.meta?.score;
    if (score != null && score < 0.7) {
      key = "tribunal-fail";
      title = "Tribunal: quality gate failed";
      const target = event.meta?.target ?? "";
      body = `Score ${score.toFixed(2)}${target ? ` on ${target.split("/").pop()}` : ""}`;
    }
  }

  // Sentinel block
  if (event.plugin === "sentinel" && event.status === "block") {
    key = "sentinel-block";
    title = "Sentinel blocked a destructive operation";
    body = event.detail ?? event.label ?? "Safety gate triggered";
  }

  if (!title || !key) return;

  // Rate limit: 30s per key
  const now = Date.now();
  if (notifTimestamps[key] && now - notifTimestamps[key] < 30000) return;
  notifTimestamps[key] = now;

  const notif = new Notification({ title, body, silent: false });
  notif.on("click", () => mainWindow?.show());
  notif.show();
}

// Register notification listener after log handlers are set up
function registerNotificationListener() {
  ipcMain.on(IPC.LOGS_EVENT, (_e, event) => {
    // This fires when log-watcher forwards events — piggyback on it
  });

  // Hook into the mainWindow webContents send to intercept events
  const origSend = mainWindow?.webContents?.send?.bind(mainWindow.webContents);
  if (origSend) {
    mainWindow.webContents.send = (channel, ...args) => {
      origSend(channel, ...args);
      if (channel === IPC.LOGS_EVENT && args[0]) {
        maybeNotify(args[0]);
      }
    };
  }
}

function registerSettingsHandlers() {
  ipcMain.handle(IPC.SETTINGS_GET, () => store.store);
  ipcMain.handle(IPC.SETTINGS_SET, (_e, partial) => {
    Object.entries(partial).forEach(([k, v]) => store.set(k, v));
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  registerWindowHandlers();
  registerSettingsHandlers();
  registerKeyHandlers(ipcMain);
  registerChatHandlers(ipcMain, mainWindow, store);
  registerLogHandlers(ipcMain, mainWindow, store);
  registerPluginHandlers(ipcMain, store);
  registerNotificationListener();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => stopAllWatchers());
