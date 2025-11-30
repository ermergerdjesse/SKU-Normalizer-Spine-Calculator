// Basic configuration for normalization rules

const COLOR_KEYWORDS = [
  "GUNMETAL",
  "HONEYCOMB",
  "LEMONAPPEAL",
  "MIDNIGHTBLUE",
  "OLIVE",
  "ORCHIDEE",
  "GOLD",
  "SILVER",
  "COPPER",
  "BLACK",
  "WHITE"
];

// You can add synonym mappings here if you want to collapse similar values
const COLOR_SYNONYMS = {
  GUN: "GUNMETAL",
  GUNM: "GUNMETAL",
  HONEY: "HONEYCOMB",
  MIDNIGHT: "MIDNIGHTBLUE"
};

document.addEventListener("DOMContentLoaded", () => {
  const skuInput = document.getElementById("skuInput");
  const normalizeBtn = document.getElementById("normalizeBtn");
  const clearBtn = document.getElementById("clearBtn");
  const resultsContainer = document.getElementById("resultsContainer");
  const downloadBtn = document.getElementById("downloadBtn");

  let lastResults = [];

  normalizeBtn.addEventListener("click", () => {
    const rawText = skuInput.value || "";
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      renderEmptyState(resultsContainer);
      lastResults = [];
      downloadBtn.disabled = true;
      return;
    }

    const processed = lines.map((line) => normalizeSku(line));
    lastResults = processed;
    renderResultsTable(resultsContainer, processed);
    downloadBtn.disabled = processed.length === 0;
  });

  clearBtn.addEventListener("click", () => {
    skuInput.value = "";
    lastResults = [];
    renderEmptyState(resultsContainer);
    downloadBtn.disabled = true;
  });

  downloadBtn.addEventListener("click", () => {
    if (!lastResults || lastResults.length === 0) return;
    const csv = resultsToCsv(lastResults);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "normalized_skus.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Initial state
  renderEmptyState(resultsContainer);
});

function normalizeSku(raw) {
  const original = raw;
  const warnings = [];

  // Step 1: base clean
  let cleaned = raw.trim();
  if (cleaned.length === 0) {
    warnings.push("Empty line.");
  }

  // Uppercase everything
  cleaned = cleaned.toUpperCase();

  // Remove internal whitespace
  if (/\s/.test(cleaned)) {
    warnings.push("Whitespace removed.");
  }
  cleaned = cleaned.replace(/\s+/g, "");

  // Step 2: parse size
  const sizeMatch = cleaned.match(/(\d+(?:\.\d+)?)[X](\d+(?:\.\d+)?)/);
  let size = "";
  if (sizeMatch) {
    const width = sizeMatch[1];
    const height = sizeMatch[2];
    size = `${width}x${height}`;
  } else {
    warnings.push("No size detected.");
  }

  // Step 3: detect colors
  const detectedColors = [];

  for (const color of COLOR_KEYWORDS) {
    if (cleaned.includes(color)) {
      detectedColors.push(color);
    }
  }

  // Also look for synonyms if not already detected
  if (detectedColors.length === 0) {
    for (const [synonym, canonical] of Object.entries(COLOR_SYNONYMS)) {
      if (cleaned.includes(synonym)) {
        detectedColors.push(canonical);
      }
    }
  }

  let color = "";
  if (detectedColors.length === 1) {
    color = detectedColors[0];
  } else if (detectedColors.length > 1) {
    color = detectedColors.join("|");
    warnings.push("Multiple colors detected.");
  } else {
    warnings.push("No color detected.");
  }

  // Step 4: normalize color text inside the SKU string
  let normalized = cleaned;

  // Replace synonyms first
  for (const [synonym, canonical] of Object.entries(COLOR_SYNONYMS)) {
    const regex = new RegExp(synonym, "g");
    normalized = normalized.replace(regex, canonical);
  }

  // Ensure known colors are consistently uppercased (already uppercased earlier)
  // This can be extended to more complex remapping if needed.

  // Step 5: compute a simple status flag
  const hasWarning = warnings.length > 0;

  return {
    original,
    normalized,
    size,
    color,
    warnings,
    status: hasWarning ? "warn" : "ok"
  };
}

function renderEmptyState(container) {
  container.innerHTML = `<p class="empty-state">No results yet. Normalize some SKUs to see output.</p>`;
}

function renderResultsTable(container, results) {
  if (!results || results.length === 0) {
    renderEmptyState(container);
    return;
  }

  const rowsHtml = results
    .map((r) => {
      const warningsText =
        r.warnings && r.warnings.length > 0 ? r.warnings.join(" ") : "No issues detected.";
      const badgeClass = r.status === "ok" ? "badge ok" : "badge warn";
      const badgeLabel = r.status === "ok" ? "OK" : "Check";

      return `
        <tr>
          <td><code>${escapeHtml(r.original)}</code></td>
          <td><code>${escapeHtml(r.normalized)}</code></td>
          <td>${r.size || "<span style='color:#9ca3af'>—</span>"}</td>
          <td>${r.color || "<span style='color:#9ca3af'>—</span>"}</td>
          <td>
            <span class="${badgeClass}">${badgeLabel}</span>
            <span style="margin-left:0.4rem;font-size:0.7rem;color:#6b7280;">
              ${escapeHtml(warningsText)}
            </span>
          </td>
        </tr>
      `;
    })
    .join("");

  container.innerHTML = `
    <table class="results-table">
      <thead>
        <tr>
          <th>Original</th>
          <th>Normalized</th>
          <th>Size</th>
          <th>Color</th>
          <th>Warnings</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
}

function resultsToCsv(results) {
  const header = ["original", "normalized", "size", "color", "warnings"].join(",");
  const lines = results.map((r) => {
    const values = [
      r.original,
      r.normalized,
      r.size,
      r.color,
      (r.warnings || []).join(" ")
    ].map(csvEscape);
    return values.join(",");
  });
  return [header, ...lines].join("\r\n");
}

function csvEscape(value) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
