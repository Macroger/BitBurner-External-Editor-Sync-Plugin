/**
 * serverActionAnalyzer.js
 *
 * Description:
 *   Utility module for Bitburner scripts to analyze the effects of hack, grow, and weaken actions on a server.
 *   Provides functions to take server snapshots before and after actions, and generate detailed reports.
 *
 * Usage:
 *   import { takeServerSnapshot, generateActionReport } from "./serverActionAnalyzer.js";
 *
 *   // Example:
 *   const before = takeServerSnapshot(ns, target);
 *   // ...run action...
 *   const after = takeServerSnapshot(ns, target);
 *   const report = generateActionReport(before, after, "hack", threadCount);
 *   ns.tprint(report);
 *
 * Functions:
 *   - takeServerSnapshot(ns, server): Returns an object with key server stats.
 *   - generateActionReport(before, after, actionType, threadCount): Returns a detailed string report.
 */

/**
 * Takes a snapshot of the server's key stats.
 * @param {NS} ns - Bitburner Netscript API
 * @param {string} server - Target server hostname
 * @returns {Object} Snapshot of server stats
 */
export function takeServerSnapshot(ns, server)
{
    return {
        hostname: server,
        moneyAvailable: ns.getServerMoneyAvailable(server),
        maxMoney: ns.getServerMaxMoney(server),
        securityLevel: ns.getServerSecurityLevel(server),
        minSecurityLevel: ns.getServerMinSecurityLevel(server),
        growth: ns.getServerGrowth(server),
        hackDifficulty: ns.getServerRequiredHackingLevel(server),
        time: new Date().toLocaleTimeString(),
    };
}

    function formatCurrency(num) {
        if (num === undefined || num === null) return "$0";
        // Convert to number if string or other type
        const n = Number(num);
        if (isNaN(n)) return "$0";
        const absNum = Math.abs(n);
        if (absNum >= 1e12) return "$" + (n / 1e12).toFixed(1) + "T";
        if (absNum >= 1e9)  return "$" + (n / 1e9).toFixed(1) + "B";
        if (absNum >= 1e6)  return "$" + (n / 1e6).toFixed(1) + "M";
        if (absNum >= 1e3)  return "$" + (n / 1e3).toFixed(1) + "K";
        return "$" + n.toFixed(2);
    }

/**
 * Generates a detailed report comparing two server snapshots.
 * @param {Object} before - Snapshot before action
 * @param {Object} after - Snapshot after action
 * @param {string} actionType - "hack", "grow", or "weaken"
 * @param {number} threadCount - Number of threads used for the action
 * @returns {string} Formatted report
 */
/**
 * Generates a detailed report comparing two server snapshots.
 * @param {Object} before - Snapshot before action
 * @param {Object} after - Snapshot after action
 * @param {string} actionType - "hack", "grow", or "weaken"
 * @param {number} threadCount - Number of threads used for the action
 * @param {string} [source] - (Optional) Name of the purchased server running the action
 * @returns {string} Formatted report
 */
export function generateActionReport(before, after, actionType, threadCount, source)
    // Helper to format currency with K/M/B/T abbreviations
{
    // ANSI color codes
    const CYAN = "\x1b[36m";
    const YELLOW = "\x1b[33m";
    const BLUE = "\x1b[34m";
    const ORANGE = "\x1b[38;5;208m";
    const RED = "\x1b[31m";
    const GREEN = "\x1b[32m";
    const RESET = "\x1b[0m";
    const BOLD = "\x1b[1m";

    // Action icons and colors
    const icons = { hack: "💀", grow: "🌱", weaken: "🛡️" };
    const actionColors = { hack: RED, grow: GREEN, weaken: YELLOW };
    const actionIcon = icons[actionType] || "";
    const actionColor = actionColors[actionType] || RESET;

    // Host and target coloring
    const hostColor = CYAN;
    const targetColor = ORANGE;

    // Build the new header: "HOST is {ACTIONVERB} TARGET"
    let actionVerb = "";
    if (actionType === "hack") actionVerb = "HACKED";
    else if (actionType === "grow") actionVerb = "GREW";
    else if (actionType === "weaken") actionVerb = "WEAKENED";
    else actionVerb = actionType.toUpperCase();

    let report = `\n${BOLD}${hostColor}${source}${RESET} ${actionColor}${actionVerb}${RESET} ${targetColor}${before.hostname}${RESET} ${actionIcon}`;
    report += `\n  ${GREEN}Threads Used:${RESET} ${CYAN}${threadCount}${RESET}`;
    
    // Duration calculation (keep only one correct block)
    let durationMs = 0;
    try {
        const parseTime = t => {
            const d = new Date();
            const [time, ampm] = t.split(' ');
            let [h, m, s] = time.split(':').map(Number);
            if (ampm && ampm.toLowerCase() === 'pm' && h < 12) h += 12;
            if (ampm && ampm.toLowerCase() === 'am' && h === 12) h = 0;
            d.setHours(h, m, s, 0);
            return d.getTime();
        };
        durationMs = Math.abs(parseTime(after.time) - parseTime(before.time));
    } catch (e) {
        durationMs = 0;
    }
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    let durationStr = (minutes > 0 ? `${minutes}m ` : "") + `${seconds}s`;
    report += `\n  ${GREEN}Action Duration:${RESET} ${CYAN}${durationStr}${RESET}`;

    // Money analysis
    const moneyChange = after.moneyAvailable - before.moneyAvailable;
    const moneyChangeAbs = Math.abs(moneyChange);
    const moneyChangePct = before.maxMoney > 0 ? ((moneyChangeAbs / before.maxMoney) * 100).toFixed(2) : "N/A";
    const moneyPerThread = threadCount > 0 ? (moneyChangeAbs / threadCount).toFixed(2) : "N/A";

    if (actionType === "hack")
    {
        report += `\n  ${GREEN}Money Stolen:${RESET} ${CYAN}${formatCurrency(moneyChangeAbs)}${RESET} (${CYAN}${moneyChangePct}%${RESET} of max)`;
        report += `\n  ${GREEN}Per Thread:${RESET} ${CYAN}${formatCurrency(moneyPerThread)}${RESET}`;
        report += `\n  ${GREEN}Money Remaining:${RESET} ${CYAN}${formatCurrency(after.moneyAvailable)}${RESET} (${CYAN}${((after.moneyAvailable/after.maxMoney)*100).toFixed(2)}%${RESET} of max)`;
    }
    else if (actionType === "grow")
    {
        report += `\n  ${GREEN}Money Gained:${RESET} ${CYAN}${formatCurrency(moneyChangeAbs)}${RESET} (${CYAN}${moneyChangePct}%${RESET} of max)`;
        report += `\n  ${GREEN}Per Thread:${RESET} ${CYAN}${formatCurrency(moneyPerThread)}${RESET}`;
        report += `\n  ${GREEN}Total Money:${RESET} ${CYAN}${formatCurrency(after.moneyAvailable)}${RESET} (${CYAN}${((after.moneyAvailable/after.maxMoney)*100).toFixed(2)}%${RESET} of max)`;
    }
    else if (actionType === "weaken")
    {
        const secChange = before.securityLevel - after.securityLevel;
        const secChangeAbs = Math.abs(secChange);
        const secPerThread = threadCount > 0 ? (secChangeAbs / threadCount).toFixed(3) : "N/A";
        report += `\n  ${GREEN}Security Reduced:${RESET} ${CYAN}${secChangeAbs.toFixed(3)}${RESET}`;
        report += `\n  ${GREEN}Per Thread:${RESET} ${CYAN}${secPerThread}${RESET}`;
        report += `\n  ${GREEN}New Security Level:${RESET} ${CYAN}${after.securityLevel.toFixed(3)}${RESET}`;
    }
    else
    {
        report += `\n  ${GREEN}Unknown action type.${RESET}`;
    }

    // Additional info
    report += `\n  ${GREEN}Growth Stat:${RESET} ${CYAN}${before.growth}${RESET}`;
    report += "\n";
    return report;
}
