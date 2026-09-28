// DayTrackWidget for Scriptable
// Receives private DayTrack data through the iPhone clipboard.
// No server or public database is used.

const fm = FileManager.local();
const dataPath = fm.joinPath(fm.documentsDirectory(), "daytrack-widget.json");
const PREFIX = "DAYTRACK_WIDGET:";
const DAYTRACK_URL = "https://siju7555.github.io/daytrack/";

function parseLocal(date, time) {
  return new Date(date + "T" + (time || "12:00") + ":00");
}

function dayHourText(ms) {
  const totalHours = Math.max(0, Math.floor(Math.abs(ms) / 3600000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return { days, hours };
}

function statusFor(task) {
  const now = new Date();

  if (task.type === "countdown_once") {
    const target = parseLocal(task.startDate, task.startTime);
    const diff = target - now;
    const x = dayHourText(diff);
    return diff >= 0
      ? { number: x.days, label: "days left", detail: x.hours + "h" }
      : { number: x.days, label: "days passed", detail: x.hours + "h" };
  }

  if (task.type === "repeat" || task.type === "countdown") {
    const last = parseLocal(task.lastDate, task.lastTime);
    const due = new Date(last.getTime() + Number(task.repeat || 30) * 86400000);
    const diff = due - now;
    const x = dayHourText(diff);
    return diff >= 0
      ? { number: x.days, label: "days left", detail: x.hours + "h" }
      : { number: x.days, label: "days overdue", detail: x.hours + "h" };
  }

  const last = parseLocal(task.lastDate, task.lastTime);
  const diff = now - last;
  const x = dayHourText(diff);
  return { number: x.days, label: "days since", detail: x.hours + "h" };
}

function loadSaved() {
  if (!fm.fileExists(dataPath)) return null;
  try {
    return JSON.parse(fm.readString(dataPath));
  } catch (_) {
    return null;
  }
}

function saveFromClipboardIfPresent() {
  try {
    const clip = Pasteboard.pasteString();
    if (!clip || !clip.startsWith(PREFIX)) return false;
    const payload = JSON.parse(clip.slice(PREFIX.length));
    if (!payload || !Array.isArray(payload.tasks)) return false;
    fm.writeString(dataPath, JSON.stringify(payload));
    return true;
  } catch (_) {
    return false;
  }
}

function addTaskRow(widget, task, compact) {
  const s = statusFor(task);
  const row = widget.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();

  const left = row.addStack();
  left.layoutVertically();

  const name = left.addText(task.name);
  name.font = Font.semiboldSystemFont(compact ? 13 : 14);
  name.textColor = Color.white();
  name.lineLimit = 1;

  const label = left.addText(s.label + " · " + s.detail);
  label.font = Font.systemFont(compact ? 9 : 10);
  label.textColor = new Color("#9ca8be");
  label.lineLimit = 1;

  row.addSpacer();

  const num = row.addText(String(s.number));
  num.font = Font.boldSystemFont(compact ? 27 : 31);
  num.textColor = new Color("#6ea8fe");

  widget.addSpacer(compact ? 7 : 10);
}

const synced = saveFromClipboardIfPresent();
const data = loadSaved();

const widget = new ListWidget();
widget.backgroundColor = new Color("#0b1020");
widget.setPadding(14, 14, 12, 14);
widget.url = DAYTRACK_URL;

const title = widget.addText("DayTrack");
title.font = Font.boldSystemFont(15);
title.textColor = Color.white();

const subtitle = widget.addText("Private tracker");
subtitle.font = Font.systemFont(9);
subtitle.textColor = new Color("#9ca8be");
widget.addSpacer(10);

if (!data || !data.tasks || data.tasks.length === 0) {
  const t = widget.addText("No synced trackers");
  t.font = Font.semiboldSystemFont(13);
  t.textColor = Color.white();
  widget.addSpacer(4);
  const h = widget.addText("In DayTrack, enable a tracker for the widget and tap Sync widget.");
  h.font = Font.systemFont(10);
  h.textColor = new Color("#9ca8be");
  h.lineLimit = 4;
} else {
  const family = config.widgetFamily || "medium";
  let limit = 3;
  if (family === "small") limit = 1;
  if (family === "large") limit = 6;
  if (family === "extraLarge") limit = 8;

  const tasks = data.tasks.slice(0, limit);
  const compact = family === "small";

  for (const task of tasks) {
    addTaskRow(widget, task, compact);
  }

  if (data.tasks.length > limit) {
    const more = widget.addText("+" + (data.tasks.length - limit) + " more");
    more.font = Font.systemFont(9);
    more.textColor = new Color("#9ca8be");
  }

  widget.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);
}

if (synced && !config.runsInWidget) {
  const alert = new Alert();
  alert.title = "DayTrack widget synced";
  alert.message = data && data.tasks ? data.tasks.length + " tracker(s) saved." : "Widget data saved.";
  alert.addAction("OK");
  await alert.present();
}

Script.setWidget(widget);

if (!config.runsInWidget && !synced) {
  await widget.presentMedium();
}

Script.complete();
