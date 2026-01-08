"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const yaml_1 = require("yaml");
/* ============================================================
 * Helpers
 * ============================================================ */
function sh(cmd) {
    return (0, child_process_1.execSync)(cmd, { stdio: ["ignore", "pipe", "pipe"] })
        .toString("utf8")
        .trim();
}
function readYamlConfig(path) {
    try {
        if (!fs_1.default.existsSync(path))
            return {};
        return (0, yaml_1.parse)(fs_1.default.readFileSync(path, "utf8"));
    }
    catch {
        core.warning("Failed to read .selectiveci.yml, using defaults");
        return {};
    }
}
/**
 * Minimal glob matcher (predictable & safe)
 */
function matchesPattern(file, pattern) {
    const f = file.replace(/\\/g, "/");
    const p = pattern.replace(/\\/g, "/");
    if (p === f)
        return true;
    if (p.startsWith("**/*.")) {
        return f.endsWith(p.slice(4));
    }
    if (p.endsWith("/**")) {
        const base = p.slice(0, -3);
        return f === base || f.startsWith(base + "/");
    }
    return false;
}
/* ============================================================
 * Git Diff
 * ============================================================ */
function getChangedFiles() {
    const splitLines = (out) => out
        .split("\n")
        .map(s => s.trim())
        .filter(Boolean);
    try {
        const eventName = process.env.GITHUB_EVENT_NAME || "";
        const sha = process.env.GITHUB_SHA || "HEAD";
        const pr = github.context.payload?.pull_request;
        // ---------------------------
        // PR events (pull_request / pull_request_target)
        // ---------------------------
        if (eventName.includes("pull_request") && pr?.base?.ref && pr?.head?.sha) {
            const baseRef = pr.base.ref; // e.g. "main"
            const headSha = pr.head.sha; // head commit SHA
            core.info(`PR diff: baseRef=${baseRef}, headSha=${headSha}`);
            // Ensure we have the base ref and head commit locally (shallow-safe)
            sh(`git fetch --no-tags --prune --depth=50 origin ${baseRef}`);
            sh(`git fetch --no-tags --prune --depth=50 origin ${headSha}`);
            // Compute merge-base for accurate diff even if PR has merges
            const baseSha = sh(`git merge-base origin/${baseRef} ${headSha}`);
            core.info(`PR diff: merge-base=${baseSha}`);
            const out = sh(`git diff --name-only ${baseSha} ${headSha}`);
            return { files: splitLines(out), diffFailed: false };
        }
        // ---------------------------
        // Push events
        // ---------------------------
        if (eventName === "push") {
            const before = github.context.payload?.before;
            if (before && before !== "0000000000000000000000000000000000000000") {
                core.info(`Push diff: before=${before}, sha=${sha}`);
                // Ensure both commits exist locally (shallow-safe)
                sh(`git fetch --no-tags --prune --depth=50 origin ${before}`);
                sh(`git fetch --no-tags --prune --depth=50 origin ${sha}`);
                const out = sh(`git diff --name-only ${before} ${sha}`);
                return { files: splitLines(out), diffFailed: false };
            }
        }
        // ---------------------------
        // Fallback: last commit
        // ---------------------------
        core.info("Fallback diff: HEAD~1..HEAD");
        const out = sh(`git diff --name-only HEAD~1 HEAD`);
        return { files: splitLines(out), diffFailed: false };
    }
    catch (e) {
        core.warning(`DIFF_FAIL: ${e?.message || String(e)}`);
        return { files: [], diffFailed: true };
    }
}
/* ============================================================
 * Area Matching
 * ============================================================ */
function computeImpactedAreas(files, areas) {
    const impacted = new Set();
    for (const file of files) {
        for (const [areaName, area] of Object.entries(areas)) {
            if (area.paths.some(p => matchesPattern(file, p))) {
                impacted.add(areaName);
            }
        }
    }
    return Array.from(impacted).sort();
}
function decideMode(impacted, areas) {
    const reasons = [];
    if (impacted.length === 0) {
        reasons.push("UNKNOWN_FILE_TYPE");
        return { mode: "full", reasons };
    }
    const policies = impacted.map(a => areas[a]?.policy);
    if (policies.includes("full")) {
        reasons.push("POLICY_FORCE_FULL");
        return { mode: "full", reasons };
    }
    if (policies.every(p => p === "skip")) {
        reasons.push("DOCS_ONLY");
        return { mode: "skip", reasons };
    }
    reasons.push("CODE_CHANGE");
    return { mode: "selective", reasons };
}
function computeRisk(reasons) {
    if (reasons.includes("DIFF_FAIL"))
        return "high";
    if (reasons.includes("POLICY_FORCE_FULL"))
        return "high";
    if (reasons.includes("UNKNOWN_FILE_TYPE"))
        return "medium";
    if (reasons.includes("DOCS_ONLY"))
        return "low";
    return "medium";
}
function decisionId() {
    return `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_SHA?.slice(0, 7)}`;
}
/* ============================================================
 * Main
 * ============================================================ */
async function main() {
    const configPath = core.getInput("config-path") || ".selectiveci.yml";
    const cfg = readYamlConfig(configPath);
    const areas = cfg.areas || {};
    const { files, diffFailed } = getChangedFiles();
    let mode = "full";
    let targets = [];
    let fallbackUsed = false;
    const reasons = [];
    if (diffFailed) {
        reasons.push("DIFF_FAIL");
        mode = "full";
        fallbackUsed = true;
        targets = [];
    }
    else {
        targets = computeImpactedAreas(files, areas);
        const decision = decideMode(targets, areas);
        mode = decision.mode;
        reasons.push(...decision.reasons);
    }
    const decision = {
        decision_id: decisionId(),
        mode,
        targets: mode === "selective" ? targets : [],
        reason_codes: reasons,
        fallback_used: fallbackUsed,
        risk_level: computeRisk(reasons),
        estimated_minutes_saved: 0,
        explain: `Files: ${files.join(", ") || "(none)"}\nReasons: ${reasons.join(", ")}`,
        version: "v1",
    };
    /* ============================================================
     * Outputs (MATCH action.yml)
     * ============================================================ */
    core.setOutput("mode", decision.mode);
    core.setOutput("targets", decision.targets.join(","));
    core.setOutput("targets_json", JSON.stringify(decision.targets));
    core.setOutput("reasons", JSON.stringify(decision.reason_codes));
    core.setOutput("fallback", String(decision.fallback_used));
    // legacy compatibility (not documented)
    core.setOutput("confidence", decision.risk_level === "low" ? "0.95" : "0.7");
    core.setOutput("run-groups", JSON.stringify(decision.targets));
    core.setOutput("skip-groups", JSON.stringify(decision.mode === "skip" ? ["all"] : []));
    await core.summary
        .addHeading("SelectiveCI Decision (v1)")
        .addCodeBlock(JSON.stringify(decision, null, 2), "json")
        .write();
}
main().catch(err => core.setFailed(String(err)));
