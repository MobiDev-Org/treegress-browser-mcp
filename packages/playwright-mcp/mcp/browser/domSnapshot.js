"use strict";

var import_fs = require("fs");
var import_path = require("path");

const KNOWN_KIND_PRIORITY = [
  "testId",
  "role",
  "text",
  "label",
  "placeholder",
  "altText",
  "title",
  "id",
  "name",
  "dataAttr",
  "css",
  "xpath"
];

function defaultDomSerializerPath(configuredPath) {
  if (configuredPath)
    return configuredPath;
  return process.cwd() + "/domSerializer.js";
}

async function loadDomSerializerSource(configuredPath, fallbackToDefault = true) {
  const candidates = [];
  if (configuredPath)
    candidates.push(configuredPath);
  if (fallbackToDefault)
    candidates.push(defaultDomSerializerPath());
  for (const candidate of candidates) {
    const resolvedPath = import_path.resolve(process.cwd(), candidate);
    if (import_fs.existsSync(resolvedPath))
      return { path: resolvedPath, source: await import_fs.promises.readFile(resolvedPath, "utf-8") };
  }
  return { path: void 0, source: void 0 };
}

function buildCandidatesFromRaw(rawCandidates) {
  if (!rawCandidates || typeof rawCandidates !== "object")
    return [];
  const entries = [];
  const seen = new Set();

  const addCandidate = (kind, payload) => {
    if (!kind || !payload)
      return;
    const key = JSON.stringify({ kind, ...payload });
    if (seen.has(key))
      return;
    seen.add(key);
    entries.push({ kind, payload });
  };

  const parseStrategy = (strategy, details) => {
    if (!details)
      return;
    switch (strategy) {
      case "getByTestId": {
        if (details.testId)
          addCandidate("testId", { testId: details.testId });
        break;
      }
      case "getByRole": {
        if (details.role)
          addCandidate("role", { role: details.role, name: details.name, exact: details.exact !== false });
        break;
      }
      case "getByText": {
        if (details.text)
          addCandidate("text", { text: details.text, exact: details.exact !== false });
        break;
      }
      case "getByPlaceholder": {
        if (details.placeholder)
          addCandidate("placeholder", { value: details.placeholder });
        break;
      }
      case "getByCss": {
        if (details.css)
          addCandidate("css", { value: details.css });
        break;
      }
      case "getByXpath": {
        if (details.xpath)
          addCandidate("xpath", { value: details.xpath });
        break;
      }
      case "filtered_getByRole":
      case "chained_getByRole": {
        if (details.target?.details?.role)
          addCandidate("role", { role: details.target.details.role, name: details.target.details.name, exact: details.target.details.exact !== false });
        else if (details.base?.details?.role)
          addCandidate("role", { role: details.base.details.role, name: details.base.details.name, exact: details.base.details.exact !== false });
        break;
      }
      case "filtered_getByText":
      case "chained_getByText": {
        if (details.target?.details?.text)
          addCandidate("text", { text: details.target.details.text, exact: details.target.details.exact !== false });
        else if (details.base?.details?.text)
          addCandidate("text", { text: details.base.details.text, exact: details.base.details.exact !== false });
        break;
      }
      case "label": {
        if (details.label)
          addCandidate("label", { value: details.label });
        break;
      }
      default:
        break;
    }
  };

  if (Array.isArray(rawCandidates.priority)) {
    for (const strategy of rawCandidates.priority)
      parseStrategy(strategy, rawCandidates[strategy]);
  }

  if (rawCandidates.getByTestId && rawCandidates.getByTestId.testId)
    parseStrategy("getByTestId", rawCandidates.getByTestId);
  if (rawCandidates.getByRole && rawCandidates.getByRole.role)
    parseStrategy("getByRole", rawCandidates.getByRole);
  if (rawCandidates.getByText && rawCandidates.getByText.text)
    parseStrategy("getByText", rawCandidates.getByText);
  if (rawCandidates.getByPlaceholder && rawCandidates.getByPlaceholder.placeholder)
    parseStrategy("getByPlaceholder", rawCandidates.getByPlaceholder);
  if (rawCandidates.getByCss && rawCandidates.getByCss.css)
    parseStrategy("getByCss", rawCandidates.getByCss);
  if (rawCandidates.getByXpath && rawCandidates.getByXpath.xpath)
    parseStrategy("getByXpath", rawCandidates.getByXpath);

  const ordered = [];
  const addByPriority = (kind) => {
    for (const candidate of entries) {
      if (candidate.kind === kind)
        ordered.push(candidate);
    }
  };
  for (const kind of KNOWN_KIND_PRIORITY) {
    addByPriority(kind);
  }
  for (const candidate of entries) {
    if (!KNOWN_KIND_PRIORITY.includes(candidate.kind))
      ordered.push(candidate);
  }
  return ordered;
}

function collectDomNodes(node, result, onNode) {
  if (!node || typeof node !== "object")
    return;
  onNode(node, result);
  if (Array.isArray(node.children)) {
    for (const child of node.children)
      collectDomNodes(child, result, onNode);
  }
}

function candidateFromNodeAttributes(node) {
  const candidates = [];
  if (!node || typeof node !== "object")
    return candidates;

  if (node.id)
    candidates.push({ kind: "id", payload: { id: node.id } });

  if (node.tag === "input" && node.type)
    candidates.push({ kind: "dataAttr", payload: { attr: "type", value: node.type } });

  if (node.name)
    candidates.push({ kind: "name", payload: { name: node.name } });

  return candidates;
}

function normalizeDomSerializerResult(raw) {
  const result = {
    domSnapshotText: "",
    elements: []
  };
  if (!raw || typeof raw !== "object") {
    return result;
  }

  const dom = raw.dom || raw.snapshot || {};
  const locators = raw.locators || raw.locatorMap || {};
  const explicitElements = Array.isArray(raw.elements) ? raw.elements : [];

  const explicitById = new Map();
  for (const element of explicitElements) {
    if (!element?.id)
      continue;
    const id = String(element.id);
    explicitById.set(id, element);
  }

  collectDomNodes(dom, null, (node) => {
    if (!node || typeof node !== "object")
      return;

    const id = node.id != null ? String(node.id) : void 0;
    if (!id)
      return;

    const explicit = explicitById.get(id);
    const locatorInfo = explicit?.locator || explicit?.locators || locators[id];
    const candidates = explicit?.candidates?.length ? explicit.candidates : buildCandidatesFromRaw(locatorInfo) || [];
    const meta = {
      tag: node.tag || explicit?.tag,
      role: node.role || explicit?.role,
      text: node.text || explicit?.text,
      accessibleName: node.accessibleName || explicit?.accessibleName,
      isFocused: !!node.isFocused,
      onTop: !!node.onTop
    };

    const mergedCandidates = [...candidates, ...candidateFromNodeAttributes(node)];

    result.elements.push({
      id,
      candidates: mergedCandidates,
      framePath: node.framePath,
      meta
    });
  });

  if (explicitElements.length && result.elements.length === 0) {
    for (const element of explicitElements) {
      if (!element?.id)
        continue;
      result.elements.push({
        id: String(element.id),
        candidates: Array.isArray(element.candidates) ? element.candidates : [],
        framePath: element.framePath,
        meta: {
          tag: element.tag,
          role: element.role,
          text: element.text || element.accessibleName,
          accessibleName: element.accessibleName
        }
      });
    }
  }

  if (!result.elements.length && Array.isArray(raw.elements)) {
    for (const element of raw.elements) {
      if (!element?.id)
        continue;
      result.elements.push({
        id: String(element.id),
        candidates: Array.isArray(element.candidates) ? element.candidates : [],
        framePath: element.framePath,
        meta: element.meta || {}
      });
    }
  }

  result.domSnapshotText = buildDomText(dom);
  return result;
}

function escapeText(value) {
  if (!value)
    return "";
  return String(value).replace(/[\r\n]/g, " ").trim();
}

function buildDomText(node, depth = 0, result = []) {
  if (!node || typeof node !== "object")
    return result.join("\n");

  const isInteractive = node.isInteractive || node.onTop || node.role === "button" || node.role === "link" || node.role === "textbox" || node.role === "combobox" || node.tag === "input" || node.tag === "select";
  const id = node.id != null ? `[ref=${node.id}]` : "";
  if (isInteractive) {
    const indent = "  ".repeat(Math.max(0, depth));
    const role = node.role || node.tag || "element";
    const state = [];
    if (node.isFocused)
      state.push("active");
    if (node.onTop)
      state.push("interactive");
    const descriptor = [
      `${indent}- ${role}`,
      escapeText(node.accessibleName || node.text) ? ` \"${escapeText(node.accessibleName || node.text)}\"` : "",
      state.length ? ` [${state.join(", ")}]` : "",
      id ? ` [${id}]` : ""
    ].join("");
    result.push(descriptor);
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children)
      buildDomText(child, depth + 1, result);
  }
  return result.join("\n");
}

const normalizeDomSnapshotResult = normalizeDomSerializerResult;

module.exports = {
  defaultDomSerializerPath,
  loadDomSerializerSource,
  normalizeDomSerializerResult,
  normalizeDomSnapshotResult
};
