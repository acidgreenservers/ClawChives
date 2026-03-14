/**
 * Token TTL Selector UI Component
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Purpose: UI component for selecting API token expiry (TTL)
 * Location: Add to src/components/settings/ApiTokenSettings.tsx
 * Dependencies: React
 *
 * ════════════════════════════════════════════════════════════════════════════
 */

import { useState } from "react";

/**
 * Token TTL Selector Component
 *
 * @param {Object} props
 * @param {string} props.value - Current TTL value
 * @param {Function} props.onChange - Callback when TTL changes
 * @returns {JSX.Element}
 */
export function TokenTtlSelector({ value = "90d", onChange }) {
  const [customDate, setCustomDate] = useState("");
  const [showCustomDate, setShowCustomDate] = useState(value === "custom");

  const handleTtlChange = (newValue) => {
    if (newValue === "custom") {
      setShowCustomDate(true);
      onChange("custom");
    } else {
      setShowCustomDate(false);
      onChange(newValue);
    }
  };

  const handleCustomDateChange = (date) => {
    setCustomDate(date);
    onChange(date);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Token Expiration
        </label>

        <select
          value={showCustomDate ? "custom" : value}
          onChange={(e) => handleTtlChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        >
          <option value="30d">30 days</option>
          <option value="60d">60 days</option>
          <option value="90d">90 days (recommended)</option>
          <option value="never">Never (not recommended)</option>
          <option value="custom">Custom date...</option>
        </select>

        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {value === "30d" && "Token expires in 30 days. Recommended for high-security environments."}
          {value === "60d" && "Token expires in 60 days. Balanced security and convenience."}
          {value === "90d" && "Token expires in 90 days. Default setting, good for most users."}
          {value === "never" && "⚠️ Token never expires. Not recommended for security reasons."}
          {value === "custom" && "Specify a custom expiry date below."}
        </p>
      </div>

      {/* Custom Date Picker */}
      {showCustomDate && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Custom Expiry Date
          </label>

          <input
            type="datetime-local"
            value={customDate}
            onChange={(e) => handleCustomDateChange(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Token will expire on the selected date and time.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Token Expiry Display Component
 *
 * Shows remaining time until token expiry
 */
export function TokenExpiryDisplay({ expiresAt }) {
  if (!expiresAt) {
    return (
      <span className="text-sm text-gray-500 dark:text-gray-400">
        Never expires
      </span>
    );
  }

  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - now;

  if (diff <= 0) {
    return (
      <span className="text-sm text-red-600 dark:text-red-400 font-medium">
        ⚠️ Expired
      </span>
    );
  }

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  let expiryText = "";
  let colorClass = "text-gray-700 dark:text-gray-300";

  if (days > 30) {
    expiryText = `Expires in ${Math.floor(days / 30)} month(s)`;
  } else if (days > 7) {
    expiryText = `Expires in ${days} day(s)`;
  } else if (days > 0) {
    expiryText = `Expires in ${days} day(s)`;
    colorClass = "text-yellow-600 dark:text-yellow-400"; // Warning color
  } else {
    expiryText = `Expires in ${hours} hour(s)`;
    colorClass = "text-orange-600 dark:text-orange-400"; // Urgent color
  }

  return (
    <span className={`text-sm ${colorClass}`}>
      {expiryText}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// INTEGRATION EXAMPLE
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Example: Use in API Token Settings component
 */
/*
import { TokenTtlSelector, TokenExpiryDisplay } from "./TokenTtlSelector";

function ApiTokenSettings() {
  const [ttl, setTtl] = useState("90d");

  const handleCreateToken = async () => {
    const response = await fetch("/api/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        humanKey: userKey,
        ttl: ttl,
      }),
    });

    const data = await response.json();
    console.log("Token created:", data.token, "Expires:", data.expires_at);
  };

  return (
    <div>
      <h2>Create API Token</h2>

      <TokenTtlSelector
        value={ttl}
        onChange={setTtl}
      />

      <button onClick={handleCreateToken}>
        Generate Token
      </button>

      {existingTokens.map((token) => (
        <div key={token.key}>
          <span>{token.key}</span>
          <TokenExpiryDisplay expiresAt={token.expires_at} />
        </div>
      ))}
    </div>
  );
}
*/

// ──────────────────────────────────────────────────────────────────────────────
// STYLING NOTES
// ──────────────────────────────────────────────────────────────────────────────

/**
 * This component uses Tailwind CSS classes matching ClawChives' design system:
 * - Dark mode support (dark:*)
 * - Cyan accent color (focus:ring-cyan-500)
 * - Consistent spacing and typography
 *
 * If using different CSS framework, update classes accordingly.
 */
