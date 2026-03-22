import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const MARKER = "<!-- nornr-pr-audit -->";

const DEFAULT_RULES = [
  {
    id: "payment-surface",
    label: "Payment or checkout surface",
    regex: /\b(stripe|coinbase|paypal|checkout|purchase|invoice|payment|billing|transfer|sendtransaction|wallet\.send)\b/i,
    suggestion: "Consider browser checkout governance, finance close packet or a vendor-procurement lane before this merges ungoverned.",
  },
  {
    id: "tool-surface",
    label: "Tool or MCP surface",
    regex: /\b(tool_call|function_call|@tool|tools\s*=|create_mcp_tools|list_tools|mcp|computer_use|browserbase|tool_name)\b/i,
    suggestion: "Consider the MCP control server or one governed runtime lane before this capability reaches main.",
  },
  {
    id: "vendor-action",
    label: "External provider or vendor action",
    regex: /\b(fetch\(|axios\.(get|post)|requests\.(get|post)|httpx\.(get|post)|client\.(get|post)|openai|anthropic|perplexity|modal|namecheap|browser)\b/i,
    suggestion: "Consider a counterparty-aware NORNR lane so the new external action clears policy and review first.",
  },
];

const LANE_SURFACES = {
  browser: {
    label: "browser checkout governance",
    url: "https://nornr.com/browser-checkout-governance",
  },
  mcp: {
    label: "MCP control server",
    url: "https://nornr.com/mcp-control-server",
  },
  wrappers: {
    label: "spend-aware wrappers",
    url: "https://nornr.com/spend-aware-wrappers",
  },
  runtime: {
    label: "governed runtime",
    url: "https://nornr.com/governed-runtime",
  },
};

export function createBudgetShieldRuntime(env = process.env) {
  return {
    eventPath: env.GITHUB_EVENT_PATH ?? "",
    repo: env.GITHUB_REPOSITORY ?? "",
    token: env.GITHUB_TOKEN ?? "",
    configPathOverride: env.NORNR_PR_AUDIT_CONFIG_PATH ?? "",
    severityOverride: env.NORNR_PR_AUDIT_SEVERITY ?? "",
    cwd: process.cwd(),
  };
}

export function loadAuditConfig(runtime) {
  const configPath = path.resolve(runtime.cwd, runtime.configPathOverride || ".nornr-pr-audit.json");
  if (!fs.existsSync(configPath)) {
    return { rules: DEFAULT_RULES, exclude: [], severity: runtime.severityOverride || "advisory" };
  }

  const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const customRules = Array.isArray(raw.rules)
    ? raw.rules
        .map((rule) => ({
          id: String(rule.id ?? "").trim(),
          label: String(rule.label ?? "").trim(),
          regex: rule.pattern ? new RegExp(String(rule.pattern), "i") : null,
          suggestion: String(rule.suggestion ?? "").trim(),
        }))
        .filter((rule) => rule.id && rule.label && rule.regex && rule.suggestion)
    : [];

  return {
    rules: customRules.length ? customRules : DEFAULT_RULES,
    exclude: Array.isArray(raw.exclude) ? raw.exclude.map((item) => String(item)) : [],
    severity: String(runtime.severityOverride || raw.severity || "advisory").trim() || "advisory",
  };
}

export function runGit(args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

export function parseDiff(diffText, config) {
  const findings = new Map();
  let currentFile = null;

  for (const line of diffText.split("\n")) {
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice(6);
      continue;
    }

    if (!currentFile || !line.startsWith("+") || line.startsWith("+++")) {
      continue;
    }

    const content = line.slice(1).trim();
    if (!content) {
      continue;
    }

    if (config.exclude.some((pattern) => currentFile.includes(pattern))) {
      continue;
    }

    for (const rule of config.rules) {
      if (!rule.regex.test(content)) {
        continue;
      }
      const entry = findings.get(currentFile) ?? [];
      entry.push({ ruleId: rule.id, label: rule.label, content, suggestion: rule.suggestion });
      findings.set(currentFile, entry);
    }
  }

  return [...findings.entries()].map(([file, matches]) => ({
    file,
    matches: dedupeMatches(matches),
  }));
}

function dedupeMatches(matches) {
  const seen = new Set();
  return matches.filter((match) => {
    const key = `${match.ruleId}:${match.content}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function summarizeRuleIds(matches) {
  return new Set(matches.map((match) => match.ruleId));
}

export function inferLane(matches) {
  const ruleIds = summarizeRuleIds(matches);
  const hasPayment = ruleIds.has("payment-surface");
  const hasTool = ruleIds.has("tool-surface");
  const hasVendor = ruleIds.has("vendor-action");

  if (hasPayment && hasTool) {
    return {
      surface: LANE_SURFACES.runtime,
      why: "Tool authority and spend release appear in the same diff.",
      nextStep:
        "Treat this as one governed runtime lane before merge so tool authority, counterparty scope, review posture and finance packet stay tied to the same decision path.",
    };
  }

  if (hasTool && hasVendor) {
    return {
      surface: LANE_SURFACES.mcp,
      why: "Tool authority and external provider access appear together.",
      nextStep:
        "Put the new capability behind one MCP control layer before merge so the tool path clears mandate, counterparty scope and review instead of raw client authority.",
    };
  }

  if (hasPayment && hasVendor) {
    return {
      surface: LANE_SURFACES.browser,
      why: "A spend path and an external counterparty appear in the same change.",
      nextStep:
        "Route the new spend path through one reviewed release lane before merge so the payment surface keeps counterparty posture, approval state and finance-safe export attached.",
    };
  }

  if (hasTool) {
    return {
      surface: LANE_SURFACES.mcp,
      why: "A new tool or MCP surface appears in added code.",
      nextStep:
        "Add one MCP control layer before merge so the tool request becomes intent with review and audit export instead of raw local capability.",
    };
  }

  if (hasPayment) {
    return {
      surface: LANE_SURFACES.browser,
      why: "A new payment or checkout path appears in added code.",
      nextStep:
        "Put the release path behind one reviewed spend lane before merge so the payment flow keeps owner mandate, approval state and finance packet explicit.",
    };
  }

  if (hasVendor) {
    return {
      surface: LANE_SURFACES.wrappers,
      why: "A new provider or vendor-action path appears in added code.",
      nextStep:
        "Use one spend-aware ingress before merge so the new provider call carries counterparty scope, review posture and defended trail instead of a raw client call.",
    };
  }

  return {
    surface: LANE_SURFACES.runtime,
    why: "The diff introduces a consequential path that deserves one named NORNR lane.",
    nextStep:
      "Name one governed lane before merge so the control story stays explicit while the code review is still cheap.",
  };
}

export function buildComment(findings, config) {
  if (!findings.length) {
    return `${MARKER}
### NORNR PR audit

No high-signal new tool, payment or vendor-action surfaces were detected in this pull request.
`;
  }

  const lines = [
    MARKER,
    "### NORNR PR audit",
    "",
    `This pull request appears to introduce consequential execution surfaces that may deserve an explicit NORNR lane before merge. Audit posture: ${config.severity}.`,
    "",
  ];

  for (const finding of findings) {
    const labels = [...new Set(finding.matches.map((match) => match.label))];
    const lane = inferLane(finding.matches);
    lines.push(`- \`${finding.file}\` — ${labels.join(", ")}`);
    for (const match of finding.matches.slice(0, 3)) {
      lines.push(`  - \`${truncate(match.content, 120)}\``);
    }
    lines.push(`  - Likely NORNR surface: ${lane.surface.label}`);
    lines.push(`  - Why this lane: ${lane.why}`);
    lines.push(`  - Suggested next step: ${lane.nextStep}`);
    lines.push(`  - Learn more: ${lane.surface.url}`);
  }

  lines.push("");
  lines.push("This audit is advisory. The goal is to catch ungoverned spend, vendor action or tool power while the code review is still cheap.");
  return lines.join("\n");
}

function truncate(value, maxLength) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

export async function githubRequest(runtime, apiPath, init = {}) {
  const response = await fetch(`https://api.github.com${apiPath}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${runtime.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "nornr-budget-shield",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
  }

  return response.status === 204 ? null : response.json();
}

export async function upsertComment(runtime, prNumber, body) {
  const comments = await githubRequest(runtime, `/repos/${runtime.repo}/issues/${prNumber}/comments?per_page=100`);
  const existing = comments.find((comment) => String(comment.body ?? "").includes(MARKER));

  if (existing) {
    await githubRequest(runtime, `/repos/${runtime.repo}/issues/comments/${existing.id}`, {
      method: "PATCH",
      body: JSON.stringify({ body }),
    });
    return;
  }

  await githubRequest(runtime, `/repos/${runtime.repo}/issues/${prNumber}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function runBudgetShield(env = process.env) {
  const runtime = createBudgetShieldRuntime(env);
  if (!runtime.eventPath || !fs.existsSync(runtime.eventPath)) {
    console.log("No GitHub event payload found. Skipping PR comment audit.");
    return { skipped: true, reason: "missing_event" };
  }

  const event = JSON.parse(fs.readFileSync(runtime.eventPath, "utf8"));
  const pr = event.pull_request;
  if (!pr) {
    console.log("No pull_request payload present. Skipping PR comment audit.");
    return { skipped: true, reason: "missing_pull_request" };
  }

  const baseSha = pr.base?.sha;
  const headSha = pr.head?.sha;
  if (!baseSha || !headSha) {
    console.log("Missing base/head sha. Skipping PR comment audit.");
    return { skipped: true, reason: "missing_sha" };
  }

  const diff = runGit(["diff", "--unified=0", `${baseSha}...${headSha}`]);
  const config = loadAuditConfig(runtime);
  const findings = parseDiff(diff, config).filter((entry) => entry.matches.length);
  const body = buildComment(findings, config);

  if (!runtime.repo || !runtime.token) {
    console.log(body);
    return { skipped: true, reason: "missing_github_auth", findings };
  }

  try {
    await upsertComment(runtime, pr.number, body);
  } catch (error) {
    if (error instanceof Error && error.message.includes("403")) {
      console.warn("PR audit could not write a comment with the current token permissions. Skipping comment publish.");
      return { skipped: true, reason: "forbidden", findings };
    }
    throw error;
  }

  console.log(`PR audit completed with ${findings.length} file finding(s).`);
  return { findings };
}
