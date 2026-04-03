"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var tab_exports = {};
__export(tab_exports, {
  Tab: () => Tab,
  renderModalStates: () => renderModalStates,
  shouldIncludeMessage: () => shouldIncludeMessage
});
module.exports = __toCommonJS(tab_exports);
var import_events = require("events");
var import_fs = require("fs");
var import_path = require("path");
var import_utils = require("playwright-core/lib/utils");
var import_toolsExports = require("playwright-core/lib/tools/exports");
var import_utils2 = require("./tools/utils");
var import_log = require("../log");
var import_logFile = require("./logFile");
var import_dialogs = require("./tools/dialogs");
var import_files = require("./tools/files");
// TODO(treegress-release): `initPage` still relies on Playwright's private
// transform loader for TypeScript/module support. Keep this dependency for the
// first release, but move or replace it with a treegress-owned loader so the
// MCP package no longer needs stock `playwright` at runtime.
var import_transform = require("playwright/lib/transform/transform");
var import_domSnapshot = require("./domSnapshot");
const TabEvents = {
  modalState: "modalState"
};
const DOM_SNAPSHOT_KINDS = {
  testId: "testId",
  css: "css",
  xpath: "xpath",
  role: "role",
  text: "text",
  label: "label",
  placeholder: "placeholder",
  altText: "altText",
  title: "title",
  id: "id",
  name: "name",
  dataAttr: "dataAttr",
  nth: "nth"
};
const DOM_SNAPSHOT_KIND_SET = new Set(Object.values(DOM_SNAPSHOT_KINDS));
const DEFAULT_DOM_SERIALIZER = "domSerializer.js";
class Tab extends import_events.EventEmitter {
  constructor(context, page, onPageClose) {
    super();
    this._lastHeader = { title: "about:blank", url: "about:blank", current: false, console: { total: 0, warnings: 0, errors: 0 } };
    this._downloads = [];
    this._requests = [];
    this._modalStates = [];
    this._needsFullSnapshot = false;
    this._recentEventEntries = [];
    this._domMap = /* @__PURE__ */ new Map();
    this._domSnapshotVersion = 0;
    this._lastDomSnapshotAt = 0;
    this._domSnapshotText = "";
    this._customDomAliases = /* @__PURE__ */ new Map();
    this._customDomLocatorPlans = /* @__PURE__ */ new Map();
    // Historical/debug-only local DOM engine state. The active browser tool path
    // uses playwright-core custom-dom snapshots instead of this vendored runtime.
    this._domSerializerPath = void 0;
    this._domSerializer = void 0;
    this._domSerializerInitScriptRegistered = false;
    this.context = context;
    this.page = page;
    this._onPageClose = onPageClose;
    page.on("console", (event) => this._handleConsoleMessage(messageToConsoleMessage(event)));
    page.on("pageerror", (error) => this._handleConsoleMessage(pageErrorToConsoleMessage(error)));
    page.on("request", (request) => this._handleRequest(request));
    page.on("response", (response) => this._handleResponse(response));
    page.on("requestfailed", (request) => this._handleRequestFailed(request));
    page.on("close", () => this._onClose());
    page.on("filechooser", (chooser) => {
      this.setModalState({
        type: "fileChooser",
        description: "File chooser",
        fileChooser: chooser,
        clearedBy: { tool: import_files.uploadFile.schema.name, skill: "upload" }
      });
    });
    page.on("dialog", (dialog) => this._dialogShown(dialog));
    page.on("download", (download) => {
      void this._downloadStarted(download);
    });
    page.setDefaultNavigationTimeout(this.context.config.timeouts.navigation);
    page.setDefaultTimeout(this.context.config.timeouts.action);
    page[tabSymbol] = this;
    const wallTime = Date.now();
    this._consoleLog = new import_logFile.LogFile(this.context, wallTime, "console", "Console");
    this._initializedPromise = this._initialize();
  }
  static forPage(page) {
    return page[tabSymbol];
  }
  static async collectConsoleMessages(page) {
    const result = [];
    const messages = await page.consoleMessages().catch(() => []);
    for (const message of messages)
      result.push(messageToConsoleMessage(message));
    const errors = await page.pageErrors().catch(() => []);
    for (const error of errors)
      result.push(pageErrorToConsoleMessage(error));
    return result;
  }
  async _initialize() {
    for (const message of await Tab.collectConsoleMessages(this.page))
      this._handleConsoleMessage(message);
    const requests = await this.page.requests().catch(() => []);
    for (const request of requests.filter((r) => r.existingResponse() || r.failure()))
      this._requests.push(request);
    for (const initPage of this.context.config.browser.initPage || []) {
      try {
        const { default: func } = await (0, import_transform.requireOrImport)(initPage);
        await func({ page: this.page });
      } catch (e) {
        (0, import_log.logUnhandledError)(e);
      }
    }
  }
  modalStates() {
    return this._modalStates;
  }
  setModalState(modalState) {
    this._modalStates.push(modalState);
    this.emit(TabEvents.modalState, modalState);
  }
  clearModalState(modalState) {
    this._modalStates = this._modalStates.filter((state) => state !== modalState);
  }
  _dialogShown(dialog) {
    this.setModalState({
      type: "dialog",
      description: `"${dialog.type()}" dialog with message "${dialog.message()}"`,
      dialog,
      clearedBy: { tool: import_dialogs.handleDialog.schema.name, skill: "dialog-accept or dialog-dismiss" }
    });
  }
  async _downloadStarted(download) {
    const outputFile = await this.context.outputFile({ suggestedFilename: sanitizeForFilePath(download.suggestedFilename()), prefix: "download", ext: "bin" }, { origin: "code" });
    const entry = {
      download,
      finished: false,
      outputFile
    };
    this._downloads.push(entry);
    this._addLogEntry({ type: "download-start", wallTime: Date.now(), download: entry });
    await download.saveAs(entry.outputFile);
    entry.finished = true;
    this._addLogEntry({ type: "download-finish", wallTime: Date.now(), download: entry });
  }
  _clearCollectedArtifacts() {
    this._downloads.length = 0;
    this._requests.length = 0;
    this._recentEventEntries.length = 0;
    this._resetLogs();
    this._clearCustomDomSnapshotCache();
  }
  _resetLogs() {
    const wallTime = Date.now();
    this._consoleLog.stop();
    this._consoleLog = new import_logFile.LogFile(this.context, wallTime, "console", "Console");
  }
  _handleRequest(request) {
    this._requests.push(request);
    const wallTime = request.timing().startTime || Date.now();
    this._addLogEntry({ type: "request", wallTime, request });
  }
  _handleResponse(response) {
    const timing = response.request().timing();
    const wallTime = timing.responseStart + timing.startTime;
    this._addLogEntry({ type: "request", wallTime, request: response.request() });
  }
  _handleRequestFailed(request) {
    this._requests.push(request);
    const timing = request.timing();
    const wallTime = timing.responseEnd + timing.startTime;
    this._addLogEntry({ type: "request", wallTime, request });
  }
  _handleConsoleMessage(message) {
    const wallTime = message.timestamp;
    this._addLogEntry({ type: "console", wallTime, message });
    const level = consoleLevelForMessageType(message.type);
    if (level === "error" || level === "warning")
      this._consoleLog.appendLine(wallTime, () => message.toString());
  }
  _addLogEntry(entry) {
    this._recentEventEntries.push(entry);
  }
  _onClose() {
    this._clearCollectedArtifacts();
    this._onPageClose(this);
  }
  async headerSnapshot() {
    let title;
    await this._raceAgainstModalStates(async () => {
      title = await (0, import_utils2.callOnPageNoTrace)(this.page, (page) => page.title());
    });
    const newHeader = {
      title: title ?? "",
      url: this.page.url(),
      current: this.isCurrentTab(),
      console: await this.consoleMessageCount()
    };
    if (!tabHeaderEquals(this._lastHeader, newHeader)) {
      this._lastHeader = newHeader;
      return { ...this._lastHeader, changed: true };
    }
    return { ...this._lastHeader, changed: false };
  }
  isCurrentTab() {
    return this === this.context.currentTab();
  }
  async waitForLoadState(state, options) {
    await this._initializedPromise;
    await (0, import_utils2.callOnPageNoTrace)(this.page, (page) => page.waitForLoadState(state, options).catch(import_log.logUnhandledError));
  }
  async navigate(url) {
    await this._initializedPromise;
    await this.clearConsoleMessages();
    this._clearCollectedArtifacts();
    const { promise: downloadEvent, abort: abortDownloadEvent } = (0, import_utils2.eventWaiter)(this.page, "download", 3e3);
    try {
      await this.page.goto(url, { waitUntil: "domcontentloaded" });
      abortDownloadEvent();
    } catch (_e) {
      const e = _e;
      const mightBeDownload = e.message.includes("net::ERR_ABORTED") || e.message.includes("Download is starting");
      if (!mightBeDownload)
        throw e;
      const download = await downloadEvent;
      if (!download)
        throw e;
      await new Promise((resolve) => setTimeout(resolve, 500));
      return;
    }
    await this.waitForLoadState("load", { timeout: 5e3 });
  }
  async consoleMessageCount() {
    await this._initializedPromise;
    const messages = await this.page.consoleMessages();
    const pageErrors = await this.page.pageErrors();
    let errors = pageErrors.length;
    let warnings = 0;
    for (const message of messages) {
      if (message.type() === "error")
        errors++;
      else if (message.type() === "warning")
        warnings++;
    }
    return { total: messages.length + pageErrors.length, errors, warnings };
  }
  async consoleMessages(level) {
    await this._initializedPromise;
    const result = [];
    const messages = await this.page.consoleMessages();
    for (const message of messages) {
      const cm = messageToConsoleMessage(message);
      if (shouldIncludeMessage(level, cm.type))
        result.push(cm);
    }
    if (shouldIncludeMessage(level, "error")) {
      const errors = await this.page.pageErrors();
      for (const error of errors)
        result.push(pageErrorToConsoleMessage(error));
    }
    return result;
  }
  async clearConsoleMessages() {
    await this._initializedPromise;
    if (typeof this.page.clearConsoleMessages !== "function" && typeof this.page.clearPageErrors !== "function") {
      this._resetLogs();
      return;
    }
    await Promise.all([
      typeof this.page.clearConsoleMessages === "function" ? this.page.clearConsoleMessages() : Promise.resolve(),
      typeof this.page.clearPageErrors === "function" ? this.page.clearPageErrors() : Promise.resolve()
    ]);
    this._resetLogs();
  }
  async requests() {
    await this._initializedPromise;
    return this._requests;
  }
  async clearRequests() {
    await this._initializedPromise;
    this._requests.length = 0;
  }
  async captureSnapshot(relativeTo) {
    await this._initializedPromise;

    let tabSnapshot;
    const modalStates = await this._raceAgainstModalStates(async () => {
      const snapshot = await this.page._snapshotForAI({ track: "response", backend: "custom-dom" });
      if (snapshot.backend === "custom-dom" && (0, import_toolsExports.isCustomDomSnapshotEnvelope)(snapshot.envelope)) {
        const formatted = (0, import_toolsExports.formatCustomDomSnapshot)(snapshot.envelope);
        this._customDomAliases = formatted.aliasToStableId;
        this._customDomLocatorPlans = formatted.locatorPlans;
        tabSnapshot = {
          ariaSnapshot: formatted.snapshot,
          modalStates: [],
          events: []
        };
        return;
      }
      this._clearCustomDomSnapshotCache();
      tabSnapshot = {
        ariaSnapshot: snapshot.full,
        ariaSnapshotDiff: this._needsFullSnapshot ? void 0 : snapshot.incremental,
        modalStates: [],
        events: []
      };
    });
    if (tabSnapshot) {
      tabSnapshot.consoleLink = await this._consoleLog.take(relativeTo);
      tabSnapshot.events = this._recentEventEntries;
      this._recentEventEntries = [];
    }
    this._needsFullSnapshot = !tabSnapshot;
    return tabSnapshot ?? {
      ariaSnapshot: "",
      ariaSnapshotDiff: "",
      modalStates,
      events: []
    };
  }
  _javaScriptBlocked() {
    return this._modalStates.some((state) => state.type === "dialog");
  }
  async _raceAgainstModalStates(action) {
    if (this.modalStates().length)
      return this.modalStates();
    const promise = new import_utils.ManualPromise();
    const listener = (modalState) => promise.resolve([modalState]);
    this.once(TabEvents.modalState, listener);
    return await Promise.race([
      action().then(() => {
        this.off(TabEvents.modalState, listener);
        return [];
      }),
      promise
    ]);
  }
  async waitForCompletion(callback) {
    await this._initializedPromise;
    await this._raceAgainstModalStates(() => (0, import_utils2.waitForCompletion)(this, callback));
  }
  async refLocator(params) {
    await this._initializedPromise;
    return (await this.refLocators([params]))[0];
  }
  async refLocators(params) {
    await this._initializedPromise;
    return Promise.all(params.map((param) => this.resolveLocatorFromRef(param)));
  }
  async resolveLocatorFromRef(params) {
    const customDomResolved = await this._resolveLocatorFromCustomDomSnapshot(params);
    if (customDomResolved?.locator && customDomResolved?.resolved)
      return { locator: customDomResolved.locator, resolved: customDomResolved.resolved };
    const customDomSnapshotSeen = this._customDomAliases.size > 0;
    try {
      if (customDomSnapshotSeen && customDomResolved?.diagnostics)
        throw new Error((0, import_toolsExports.formatCustomDomResolverDiagnostics)(customDomResolved.diagnostics));
      let locator = this.page.locator(`aria-ref=${params.ref}`);
      if (params.element)
        locator = locator.describe(params.element);
      const { resolvedSelector } = await locator._resolveSelector();
      return { locator, resolved: (0, import_utils.asLocator)("javascript", resolvedSelector) };
    } catch (e) {
      if (customDomResolved?.diagnostics)
        throw new Error((0, import_toolsExports.formatCustomDomResolverDiagnostics)(customDomResolved.diagnostics));
      throw new Error(`Ref ${params.ref} not found in the current page snapshot. Try capturing new snapshot.`);
    }
  }
  // Historical/debug-only local DOM engine. This is intentionally not part of
  // the active browser_snapshot/ref-resolution flow anymore. Normal MCP tools
  // go through playwright-core custom-dom snapshots + locator plans.
  async _resolveLocatorFromDomSnapshot(params) {
    const entry = await this._getDomSnapshotEntry(params.ref);
    if (!entry)
      throw new Error(`Ref ${params.ref} not found in the historical local DOM snapshot map. Active browser tools use playwright-core custom-dom snapshots.`);

    const frame = this._resolveFrame(entry.framePath);
    const strict = !this.context.config.snapshot.domNonstrict;
    const attempts = [];
    let lastBaseLocator;

    for (let index = 0; index < entry.candidates.length; index++) {
      const candidate = normalizeCandidate(entry.candidates[index]);
      if (!candidate)
        continue;

      let locator;
      if (candidate.kind === DOM_SNAPSHOT_KINDS.nth) {
        const value = candidate.payload ?? {};
        const nthIndex = Number.isFinite(value.index) ? value.index : Number.isFinite(value.value) ? Number(value.value) : Number.isFinite(value.n) ? Number(value.n) : void 0;
        if (lastBaseLocator && Number.isFinite(nthIndex)) {
          locator = lastBaseLocator.nth(nthIndex);
        } else {
          continue;
        }
      } else {
        locator = buildLocatorFromCandidate(frame, candidate);
        if (!locator)
          continue;
        lastBaseLocator = locator;
      }

      let count = -1;
      try {
        count = await locator.count();
      } catch (error) {
        attempts.push({ kind: candidate.kind, payload: candidate.payload, count, error: error.message || String(error) });
        continue;
      }
      attempts.push({ kind: candidate.kind, payload: candidate.payload, count });

      if (count === 1)
        return {
          locator,
          resolved: locatorToCode(frame, entry.candidates, candidate, this.page.mainFrame() === frame, strict),
          attempts,
          meta: entry.meta
        };
      if (!strict && count > 0)
        return {
          locator: locator.first(),
          resolved: locatorToCode(frame, entry.candidates, candidate, this.page.mainFrame() === frame, strict),
          attempts,
          meta: entry.meta
        };
    }

    if (!strict) {
      const fallback = await this._resolveLocatorByNonstrict(entry, frame);
      if (fallback)
        return fallback;
    }

    if (this.context.config.snapshot.domFallbackToAria) {
      const locator = this.page.locator(`aria-ref=${params.ref}`);
      const { resolvedSelector } = await locator._resolveSelector();
      return { locator, resolved: (0, import_utils.asLocator)("javascript", resolvedSelector) };
    }

    const details = attempts.map((attempt) => {
      const extra = attempt.error ? ` error=${attempt.error}` : "";
      return `kind=${attempt.kind} count=${attempt.count}${extra}`;
    }).join(", ");
    const candidates = entry.candidates.map((candidate) => JSON.stringify(candidate)).join(", ");
    throw new Error(`Failed to resolve ref ${params.ref} by DOM candidates. Candidates: [${candidates}]. Attempts: [${details}]`);
  }
  async _resolveLocatorByNonstrict(entry, frame) {
    for (const raw of entry.candidates) {
      const candidate = normalizeCandidate(raw);
      if (!candidate || candidate.kind === DOM_SNAPSHOT_KINDS.nth)
        continue;
      const locator = buildLocatorFromCandidate(frame, candidate);
      if (!locator)
        continue;
      try {
        if (await locator.count() > 0)
          return { locator, resolved: locatorToCode(frame, entry.candidates, candidate, this.page.mainFrame() === frame, false) };
      } catch (e) {
      }
    }
    return void 0;
  }
  async _getDomSnapshotEntry(ref) {
    let entry = this._domMap.get(ref);
    if (!entry) {
      await this._captureDomSnapshotToMap();
      entry = this._domMap.get(ref);
    }
    return entry;
  }
  async _captureDomSnapshotToMap() {
    const raw = await this._runDomSerializer();
    const normalized = import_domSnapshot.normalizeDomSnapshotResult(raw);
    const domSnapshotText = normalized.domSnapshotText || fallbackDomSnapshotTextFromElements(normalized.elements);
    this._domMap = new Map();
    for (const element of normalized.elements) {
      if (!element.id)
        continue;
      this._domMap.set(element.id, {
        candidates: normalizeCandidates(element.candidates || []),
        framePath: element.framePath,
        meta: element.meta
      });
    }
    this._domSnapshotVersion++;
    this._lastDomSnapshotAt = Date.now();
    this._domSnapshotText = domSnapshotText;
    return domSnapshotText;
  }
  async _captureDomSnapshot() {
    const snapshotText = await this._captureDomSnapshotToMap();
    return {
      ariaSnapshot: snapshotText,
      ariaSnapshotDiff: this._needsFullSnapshot ? void 0 : snapshotText,
      modalStates: [],
      events: []
    };
  }
  async _runDomSerializer() {
    const serializer = await this._resolveDomSerializerModule();
    return runDomSerializer(serializer, this.page, this._domSerializerPath);
  }
  async _resolveDomSerializerModule() {
    const serializerPath = resolveDomSerializerPath(this.context.config.snapshot.domSerializerPath);
    if (this._domSerializerPath === serializerPath && this._domSerializer)
      return this._domSerializer;

    if (!serializerPath || !import_fs.existsSync(serializerPath))
      throw new Error(`DOM snapshot engine is enabled, but domSerializer.js was not found. Searched at ${serializerPath}. Pass --dom-serializer or PLAYWRIGHT_MCP_DOM_SERIALIZER_PATH.`);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const required = require(serializerPath);
    const serializer = pickDomSerializer(required);
    if (!serializer)
      throw new Error(`Could not initialize domSerializer.js from ${serializerPath}. Expected a function or serializable object.`);
    if (!this._domSerializerInitScriptRegistered) {
      await this.page.context().addInitScript({ path: serializerPath });
      this._domSerializerInitScriptRegistered = true;
    }
    this._domSerializerPath = serializerPath;
    this._domSerializer = serializer;
    return serializer;
  }
  _resolveFrame(framePath) {
    const frame = this.page.mainFrame();
    const path = parseFramePath(framePath);
    let current = frame;
    for (const index of path) {
      if (!Number.isFinite(index) || index < 0)
        return frame;
      const child = current.childFrames()[index];
      if (!child)
        return frame;
      current = child;
    }
    return current;
  }
  async waitForTimeout(time) {
    if (this._javaScriptBlocked()) {
      await new Promise((f) => setTimeout(f, time));
      return;
    }
    await (0, import_utils2.callOnPageNoTrace)(this.page, (page) => {
      return page.evaluate(() => new Promise((f) => setTimeout(f, 1e3))).catch(() => {
      });
    });
  }
  _clearCustomDomSnapshotCache() {
    this._customDomAliases.clear();
    this._customDomLocatorPlans.clear();
  }
  _resolveFrameByPath(framePath) {
    let frame = this.page.mainFrame();
    for (const childIndex of framePath) {
      const childFrames = frame.childFrames();
      frame = childFrames[childIndex];
      if (!frame)
        return;
    }
    return frame;
  }
  async _resolveLocatorFromCustomDomSnapshot(params) {
    const diagnostics = {
      ref: params.ref,
      alias: {
        status: "missing"
      },
      locatorPlan: {
        status: "not-checked"
      },
      frame: {
        status: "not-checked"
      },
      candidates: {
        total: 0,
        attempts: []
      },
      outcome: {
        status: "alias-missing"
      }
    };
    const alias = this._customDomAliases.get(params.ref);
    if (!alias)
      return { diagnostics };
    diagnostics.alias = {
      status: "found",
      stableId: alias.stableId,
      framePath: [...alias.framePath]
    };
    const planKey = (0, import_toolsExports.customDomStableLocatorKey)(alias.framePath, alias.stableId);
    diagnostics.locatorPlan = {
      status: "missing",
      key: planKey
    };
    const locatorPlan = this._customDomLocatorPlans.get(planKey);
    if (!locatorPlan)
      return {
        diagnostics: {
          ...diagnostics,
          outcome: {
            status: "locator-plan-missing"
          }
        }
      };
    diagnostics.locatorPlan = {
      status: "found",
      key: planKey
    };
    const frame = this._resolveFrameByPath(alias.framePath);
    if (!frame)
      return {
        diagnostics: {
          ...diagnostics,
          frame: {
            status: "stale",
            framePath: [...alias.framePath]
          },
          outcome: {
            status: "frame-stale"
          }
        }
      };
    diagnostics.frame = {
      status: "resolved",
      framePath: [...alias.framePath]
    };
    const candidates = (0, import_toolsExports.compileLocatorCandidatesFromPlan)(frame, locatorPlan);
    diagnostics.candidates.total = candidates.length;
    if (!candidates.length)
      return {
        diagnostics: {
          ...diagnostics,
          outcome: {
            status: "no-candidates"
          }
        }
      };
    const inspection = await (0, import_toolsExports.inspectLocatorCandidates)(candidates);
    diagnostics.candidates.attempts = inspection.attempts;
    const candidate = inspection.selected;
    if (!candidate) {
      return {
        diagnostics: {
          ...diagnostics,
          outcome: {
            status: inspection.outcome === "ambiguous" ? "ambiguous" : "no-match"
          }
        }
      };
    }
    let locator = candidate.locator;
    if (params.element)
      locator = locator.describe(params.element);
    return {
      locator,
      resolved: await locator._resolveForCode(),
      diagnostics: {
        ...diagnostics,
        outcome: {
          status: "resolved",
          selectedStrategy: candidate.strategy
        }
      }
    };
  }
}
// Historical/debug-only local DOM engine helpers. Keep only for one-off
// forensics while the active MCP browser tool path stays delegated to
// playwright-core custom-dom snapshots.
function resolveDomSerializerPath(configuredPath) {
  const candidates = [];
  if (configuredPath)
    candidates.push(import_path.resolve(process.cwd(), configuredPath));
  candidates.push(import_path.resolve(process.cwd(), DEFAULT_DOM_SERIALIZER));
  candidates.push(import_path.resolve(__dirname, "../../../..", DEFAULT_DOM_SERIALIZER));
  for (const candidate of candidates) {
    if (import_fs.existsSync(candidate))
      return candidate;
  }
  return candidates[0] ?? null;
}
function pickDomSerializer(required) {
  if (typeof required === "function")
    return required;
  if (required?.default && typeof required.default === "function")
    return required.default;
  if (typeof required?.serialize === "function")
    return required.serialize;
  if (typeof required?.serializeDOM === "function")
    return required.serializeDOM;
  if (typeof required?.getFlexibleLocators === "function")
    return required.getFlexibleLocators;
  if (typeof required?.snapshot === "function")
    return required.snapshot;
  if (typeof required?.getSnapshot === "function")
    return required.getSnapshot;
  if (required && typeof required === "object" && (required.dom || required.snapshot || required.elements))
    return () => required;
  return void 0;
}
async function runDomSerializer(serializer, page, serializerPath) {
  const candidateArgs = [page, page.mainFrame(), void 0];
  let lastError;
  for (const args of candidateArgs.map((value) => [value])) {
    try {
      const result = await Promise.resolve(serializer(...args));
      if (result !== void 0 && !isEmptyDomSerializerResult(result))
        return result;
    } catch (e) {
      lastError = e;
    }
  }
  try {
    const direct = await Promise.resolve(serializer());
    if (!isEmptyDomSerializerResult(direct))
      return direct;
  } catch (error) {
    lastError = lastError || error;
  }

  const browserResult = await runDomSerializerInPage(page, serializerPath);
  if (!isEmptyDomSerializerResult(browserResult))
    return browserResult;

  if (lastError)
    throw lastError;
  throw new Error("DOM serializer returned an empty snapshot. Ensure domSerializer.js produces DOM tree data and element ids in the current page.");
}
function isEmptyDomSerializerResult(raw) {
  if (raw === void 0 || raw === null)
    return true;
  if (typeof raw === "string")
    return raw.trim().length === 0;
  if (Array.isArray(raw))
    return raw.length === 0;
  if (typeof raw !== "object")
    return false;
  const normalized = import_domSnapshot.normalizeDomSnapshotResult(raw);
  if (normalized.elements.length > 0)
    return false;
  if ((normalized.domSnapshotText || "").trim().length > 0)
    return false;
  if (typeof raw.domSnapshotText === "string" && raw.domSnapshotText.trim())
    return false;
  if (typeof raw.snapshotText === "string" && raw.snapshotText.trim())
    return false;
  return true;
}
async function runDomSerializerInPage(page, serializerPath) {
  if (!serializerPath)
    return void 0;
  await ensureDomSerializerLoadedInPage(page, serializerPath);
  const result = await page.evaluate(() => {
    const serializer = typeof globalThis.serializeDOM === "function" ? globalThis.serializeDOM : typeof globalThis.domSerializer === "function" ? globalThis.domSerializer : typeof globalThis.domSerializer?.serializeDOM === "function" ? globalThis.domSerializer.serializeDOM : void 0;
    if (typeof serializer !== "function")
      return { __pwMcpDomSerializerError: "serializeDOM function was not found on window after loading domSerializer.js" };
    try {
      const root = document.documentElement || document.body || document;
      return serializer(root);
    } catch (error) {
      const message = error && typeof error === "object" && "stack" in error ? String(error.stack) : String(error);
      return { __pwMcpDomSerializerError: message };
    }
  });
  if (result && typeof result === "object" && result.__pwMcpDomSerializerError)
    throw new Error(`Failed to execute domSerializer.js in browser context: ${result.__pwMcpDomSerializerError}`);
  return result;
}
async function ensureDomSerializerLoadedInPage(page, serializerPath) {
  const hasSerializer = await page.evaluate(() => {
    return typeof globalThis.serializeDOM === "function" || typeof globalThis.domSerializer === "function" || typeof globalThis.domSerializer?.serializeDOM === "function";
  }).catch(() => false);
  if (hasSerializer)
    return;

  try {
    await page.addScriptTag({ path: serializerPath });
    return;
  } catch (_error) {
  }

  const serializerSource = await import_fs.promises.readFile(serializerPath, "utf-8");
  await page.waitForFunction(() => !!document.documentElement, void 0, { timeout: 3e3 }).catch(() => {
  });
  await page.evaluate((source) => {
    const parent = document.head || document.body || document.documentElement;
    if (!parent)
      throw new Error("No document root available for domSerializer.js injection");
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.text = `${source}
//# sourceURL=domSerializer.js`;
    parent.appendChild(script);
    script.remove();
  }, serializerSource);
}
function normalizeCandidates(candidates) {
  if (!Array.isArray(candidates))
    return [];
  const result = [];
  const seen = new Set();
  for (const candidate of candidates) {
    const normalized = normalizeCandidate(candidate);
    if (!normalized)
      continue;
    const key = `${normalized.kind}:${JSON.stringify(normalized.payload)}`;
    if (seen.has(key))
      continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}
function normalizeCandidate(raw) {
  if (!raw || typeof raw !== "object")
    return void 0;
  const kind = raw.kind || raw.type || raw.strategy || raw.candidateKind;
  if (typeof kind === "string" && DOM_SNAPSHOT_KIND_SET.has(kind))
    return { kind, payload: normalizeCandidatePayload(kind, raw.payload ?? raw)};

  if (raw.getByTestId && raw.getByTestId.testId)
    return { kind: DOM_SNAPSHOT_KINDS.testId, payload: { testId: raw.getByTestId.testId } };
  if (raw.getByRole && raw.getByRole.role)
    return { kind: DOM_SNAPSHOT_KINDS.role, payload: raw.getByRole };
  if (raw.getByText && raw.getByText.text)
    return { kind: DOM_SNAPSHOT_KINDS.text, payload: raw.getByText };
  if (raw.getByPlaceholder && raw.getByPlaceholder.placeholder)
    return { kind: DOM_SNAPSHOT_KINDS.placeholder, payload: raw.getByPlaceholder };
  if (raw.getByCss && raw.getByCss.css)
    return { kind: DOM_SNAPSHOT_KINDS.css, payload: raw.getByCss };
  if (raw.getByXpath && raw.getByXpath.xpath)
    return { kind: DOM_SNAPSHOT_KINDS.xpath, payload: raw.getByXpath };

  if (raw.target && raw.target.kind)
    return normalizeCandidate(raw.target);

  if (typeof raw.role === "string")
    return { kind: DOM_SNAPSHOT_KINDS.role, payload: raw };
  if (typeof raw.testId === "string")
    return { kind: DOM_SNAPSHOT_KINDS.testId, payload: raw };
  if (typeof raw.css === "string")
    return { kind: DOM_SNAPSHOT_KINDS.css, payload: raw };
  if (typeof raw.xpath === "string")
    return { kind: DOM_SNAPSHOT_KINDS.xpath, payload: raw };
  if (typeof raw.text === "string")
    return { kind: DOM_SNAPSHOT_KINDS.text, payload: raw };
  if (typeof raw.value === "string")
    return { kind: DOM_SNAPSHOT_KINDS.text, payload: raw };
  if (typeof raw.id === "string")
    return { kind: DOM_SNAPSHOT_KINDS.id, payload: raw };
  if (typeof raw.nth === "number" || typeof raw.n === "number" || typeof raw.index === "number")
    return { kind: DOM_SNAPSHOT_KINDS.nth, payload: { index: raw.index ?? raw.n ?? raw.nth } };

  return void 0;
}
function normalizeCandidatePayload(kind, raw) {
  if (!raw || typeof raw !== "object")
    return {};
  switch (kind) {
    case DOM_SNAPSHOT_KINDS.testId:
      return { testId: raw.testId || raw.value || raw.id || raw.selector };
    case DOM_SNAPSHOT_KINDS.role:
      return {
        role: raw.role,
        name: raw.name,
        exact: raw.exact
      };
    case DOM_SNAPSHOT_KINDS.text:
    case DOM_SNAPSHOT_KINDS.label:
    case DOM_SNAPSHOT_KINDS.placeholder:
    case DOM_SNAPSHOT_KINDS.altText:
    case DOM_SNAPSHOT_KINDS.title:
      return {
        text: raw.text || raw.value || raw.label || raw.placeholder || raw.altText || raw.title,
        exact: raw.exact
      };
    case DOM_SNAPSHOT_KINDS.css:
    case DOM_SNAPSHOT_KINDS.xpath:
      return {
        value: raw.value || raw.css || raw.xpath
      };
    case DOM_SNAPSHOT_KINDS.id:
      return { id: raw.id || raw.value };
    case DOM_SNAPSHOT_KINDS.name:
      return { name: raw.name || raw.value };
    case DOM_SNAPSHOT_KINDS.dataAttr:
      return { attr: raw.attr, value: raw.value };
    case DOM_SNAPSHOT_KINDS.nth:
      return {
        index: Number.isFinite(raw.index) ? raw.index : Number.isFinite(raw.value) ? raw.value : raw.n
      };
    default:
      return raw;
  }
}
function buildLocatorFromCandidate(frame, candidate) {
  const payload = candidate.payload || {};
  switch (candidate.kind) {
    case DOM_SNAPSHOT_KINDS.testId: {
      if (typeof payload.testId !== "string" && typeof payload.value !== "string")
        return void 0;
      return frame.getByTestId(payload.testId || payload.value);
    }
    case DOM_SNAPSHOT_KINDS.css: {
      if (!payload.value)
        return void 0;
      return frame.locator(payload.value);
    }
    case DOM_SNAPSHOT_KINDS.xpath: {
      if (!payload.value)
        return void 0;
      return frame.locator(`xpath=${payload.value}`);
    }
    case DOM_SNAPSHOT_KINDS.role: {
      if (!payload.role)
        return void 0;
      const options = {};
      if (payload.name)
        options.name = payload.name;
      if (payload.exact !== void 0)
        options.exact = payload.exact;
      return frame.getByRole(payload.role, options);
    }
    case DOM_SNAPSHOT_KINDS.text: {
      if (!payload.text)
        return void 0;
      return frame.getByText(payload.text, payload.exact === void 0 ? void 0 : { exact: payload.exact });
    }
    case DOM_SNAPSHOT_KINDS.label: {
      if (!payload.text)
        return void 0;
      return frame.getByLabel(payload.text, payload.exact === void 0 ? void 0 : { exact: payload.exact });
    }
    case DOM_SNAPSHOT_KINDS.placeholder: {
      if (!payload.text)
        return void 0;
      return frame.getByPlaceholder(payload.text, payload.exact === void 0 ? void 0 : { exact: payload.exact });
    }
    case DOM_SNAPSHOT_KINDS.altText: {
      if (!payload.text)
        return void 0;
      return frame.getByAltText(payload.text, payload.exact === void 0 ? void 0 : { exact: payload.exact });
    }
    case DOM_SNAPSHOT_KINDS.title: {
      if (!payload.text)
        return void 0;
      return frame.getByTitle(payload.text, payload.exact === void 0 ? void 0 : { exact: payload.exact });
    }
    case DOM_SNAPSHOT_KINDS.id: {
      if (!payload.id)
        return void 0;
      return frame.locator(`#${cssEscape(payload.id)}`);
    }
    case DOM_SNAPSHOT_KINDS.name: {
      if (!payload.name)
        return void 0;
      return frame.locator(`[name=${quoteAttributeValue(payload.name)}]`);
    }
    case DOM_SNAPSHOT_KINDS.dataAttr: {
      if (!payload.attr || !payload.value)
        return void 0;
      return frame.locator(`[${payload.attr}=${quoteAttributeValue(payload.value)}]`);
    }
    default:
      return void 0;
  }
}
function locatorToCode(frame, candidates, selectedCandidate, isMainFrame, strict) {
  const root = isMainFrame ? "" : "mainFrame().";
  const baseCandidates = candidates.map((candidate) => normalizeCandidate(candidate)).filter(Boolean);
  const selected = selectedCandidate ? normalizeCandidate(selectedCandidate) : void 0;
  const candidate = selected?.kind !== DOM_SNAPSHOT_KINDS.nth ? selected : baseCandidates.find((entry) => entry.kind !== DOM_SNAPSHOT_KINDS.nth);
  const nthCandidate = baseCandidates.find((entry) => entry.kind === DOM_SNAPSHOT_KINDS.nth);
  if (!candidate)
    return `${root}locator(':scope')`;

  const prefix = root;
  let result = "";
  const payload = candidate.payload || {};
  switch (candidate.kind) {
    case DOM_SNAPSHOT_KINDS.testId:
      result = `${prefix}getByTestId(${quoteString(payload.testId || payload.value)})`;
      break;
    case DOM_SNAPSHOT_KINDS.css:
      result = `${prefix}locator(${quoteString(payload.value)})`;
      break;
    case DOM_SNAPSHOT_KINDS.xpath:
      result = `${prefix}locator(${quoteString(`xpath=${payload.value}`)})`;
      break;
    case DOM_SNAPSHOT_KINDS.role:
      result = `${prefix}getByRole(${quoteString(payload.role)}, ${formatGetByOptions(payload)})`;
      break;
    case DOM_SNAPSHOT_KINDS.text:
      result = `${prefix}getByText(${quoteString(payload.text)}, ${formatGetByOptions(payload)})`;
      break;
    case DOM_SNAPSHOT_KINDS.label:
      result = `${prefix}getByLabel(${quoteString(payload.text)}, ${formatGetByOptions(payload)})`;
      break;
    case DOM_SNAPSHOT_KINDS.placeholder:
      result = `${prefix}getByPlaceholder(${quoteString(payload.text)}, ${formatGetByOptions(payload)})`;
      break;
    case DOM_SNAPSHOT_KINDS.altText:
      result = `${prefix}getByAltText(${quoteString(payload.text)}, ${formatGetByOptions(payload)})`;
      break;
    case DOM_SNAPSHOT_KINDS.title:
      result = `${prefix}getByTitle(${quoteString(payload.text)}, ${formatGetByOptions(payload)})`;
      break;
    case DOM_SNAPSHOT_KINDS.id:
      result = `${prefix}locator(${quoteString(`#${payload.id}`)})`;
      break;
    case DOM_SNAPSHOT_KINDS.name:
      result = `${prefix}locator(${quoteString(`[name=${payload.name}]`)})`;
      break;
    case DOM_SNAPSHOT_KINDS.dataAttr:
      result = `${prefix}locator(${quoteString(`[${payload.attr}=${quoteAttributeValue(payload.value)}]`)}`;
      break;
    default:
      result = `${prefix}locator(':scope')`;
  }
  if (nthCandidate) {
    const nthPayload = nthCandidate.payload || {};
    const idx = Number.isFinite(nthPayload.index) ? nthPayload.index : 0;
    result += `.nth(${idx})`;
  }
  if (!strict)
    result += ".first()";
  return result;
}
function formatGetByOptions(payload) {
  const options = [];
  if (payload.name)
    options.push(`name: ${quoteString(payload.name)}`);
  if (payload.exact !== void 0)
    options.push(`exact: ${payload.exact}`);
  if (!options.length)
    return "{ }";
  return `{ ${options.join(", ")} }`;
}
function quoteString(value) {
  if (typeof value === "string")
    return JSON.stringify(value);
  return JSON.stringify(String(value));
}
function quoteAttributeValue(value) {
  const escaped = cssEscape(String(value));
  return `\"${escaped}\"`;
}
function cssEscape(value) {
  return String(value).replace(/[\\"']/g, "\\$&").replace(/[\n\r\t]/g, " ");
}
function fallbackDomSnapshotTextFromElements(elements) {
  const lines = [];
  for (const element of elements) {
    if (!element?.id)
      continue;
    const text = element.meta?.accessibleName || element.meta?.text || element.meta?.tag || "element";
    lines.push(`- ${element.meta?.tag || "element"} "${text}" [ref=${element.id}]`);
  }
  return lines.join("\n");
}
function parseFramePath(framePath) {
  if (typeof framePath === "number")
    return [framePath];
  if (typeof framePath === "string") {
    const trimmed = framePath.trim();
    if (!trimmed)
      return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed))
        return parsed.map((value) => Number(value)).filter((value) => Number.isFinite(value));
    } catch (e) {
    }
    if (/^[0-9,.\/-]+$/.test(trimmed))
      return trimmed.split(/[.,/]/).map((value) => Number(value)).filter((value) => Number.isFinite(value));
    return [];
  }
  if (Array.isArray(framePath))
    return framePath.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  return [];
}
function messageToConsoleMessage(message) {
  const type = typeof message.type === "function" ? message.type() : message.type || "log";
  const text = typeof message.text === "function" ? message.text() : String(message.text ?? "");
  const timestamp = typeof message.timestamp === "function" ? message.timestamp() : typeof message.timestamp === "number" ? message.timestamp : Date.now();
  const location = typeof message.location === "function" ? message.location() : message.location || {};
  const locationUrl = location?.url || "unknown";
  const locationLine = location?.lineNumber ?? location?.line ?? 0;
  return {
    type,
    timestamp,
    text,
    toString: () => `[${type.toUpperCase()}] ${text} @ ${locationUrl}:${locationLine}`
  };
}
function pageErrorToConsoleMessage(errorOrValue) {
  if (errorOrValue instanceof Error) {
    return {
      type: "error",
      timestamp: Date.now(),
      text: errorOrValue.message,
      toString: () => errorOrValue.stack || errorOrValue.message
    };
  }
  return {
    type: "error",
    timestamp: Date.now(),
    text: String(errorOrValue),
    toString: () => String(errorOrValue)
  };
}
function renderModalStates(config, modalStates) {
  const result = [];
  if (modalStates.length === 0)
    result.push("- There is no modal state present");
  for (const state of modalStates)
    result.push(`- [${state.description}]: can be handled by ${config.skillMode ? state.clearedBy.skill : state.clearedBy.tool}`);
  return result;
}
const consoleMessageLevels = ["error", "warning", "info", "debug"];
function shouldIncludeMessage(thresholdLevel, type) {
  const messageLevel = consoleLevelForMessageType(type);
  return consoleMessageLevels.indexOf(messageLevel) <= consoleMessageLevels.indexOf(thresholdLevel);
}
function consoleLevelForMessageType(type) {
  switch (type) {
    case "assert":
    case "error":
      return "error";
    case "warning":
      return "warning";
    case "count":
    case "dir":
    case "dirxml":
    case "info":
    case "log":
    case "table":
    case "time":
    case "timeEnd":
      return "info";
    case "clear":
    case "debug":
    case "endGroup":
    case "profile":
    case "profileEnd":
    case "startGroup":
    case "startGroupCollapsed":
    case "trace":
      return "debug";
    default:
      return "info";
  }
}
const tabSymbol = Symbol("tabSymbol");
function sanitizeForFilePath(s) {
  const sanitize = (s2) => s2.replace(/[\x00-\x2C\x2E-\x2F\x3A-\x40\x5B-\x60\x7B-\x7F]+/g, "-");
  const separator = s.lastIndexOf(".");
  if (separator === -1)
    return sanitize(s);
  return sanitize(s.substring(0, separator)) + "." + sanitize(s.substring(separator + 1));
}
function tabHeaderEquals(a, b) {
  return a.title === b.title && a.url === b.url && a.current === b.current && a.console.errors === b.console.errors && a.console.warnings === b.console.warnings && a.console.total === b.console.total;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Tab,
  renderModalStates,
  shouldIncludeMessage
});
