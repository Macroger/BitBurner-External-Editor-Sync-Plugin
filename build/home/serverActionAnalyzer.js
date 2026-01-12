// servers/home/serverActionAnalyzer.js
function takeServerSnapshot(ns, server) {
  return {
    hostname: server,
    moneyAvailable: ns.getServerMoneyAvailable(server),
    maxMoney: ns.getServerMaxMoney(server),
    securityLevel: ns.getServerSecurityLevel(server),
    minSecurityLevel: ns.getServerMinSecurityLevel(server),
    growth: ns.getServerGrowth(server),
    hackDifficulty: ns.getServerRequiredHackingLevel(server),
    time: (/* @__PURE__ */ new Date()).toLocaleTimeString()
  };
}
function formatCurrency(num) {
  if (num === void 0 || num === null) return "$0";
  const n = Number(num);
  if (isNaN(n)) return "$0";
  const absNum = Math.abs(n);
  if (absNum >= 1e12) return "$" + (n / 1e12).toFixed(1) + "T";
  if (absNum >= 1e9) return "$" + (n / 1e9).toFixed(1) + "B";
  if (absNum >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (absNum >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  return "$" + n.toFixed(2);
}
function generateActionReport(before, after, actionType, threadCount, source) {
  const CYAN = "\x1B[36m";
  const YELLOW = "\x1B[33m";
  const BLUE = "\x1B[34m";
  const ORANGE = "\x1B[38;5;208m";
  const RED = "\x1B[31m";
  const GREEN = "\x1B[32m";
  const RESET = "\x1B[0m";
  const BOLD = "\x1B[1m";
  const icons = { hack: "\u{1F480}", grow: "\u{1F331}", weaken: "\u{1F6E1}\uFE0F" };
  const actionColors = { hack: RED, grow: GREEN, weaken: YELLOW };
  const actionIcon = icons[actionType] || "";
  const actionColor = actionColors[actionType] || RESET;
  const hostColor = CYAN;
  const targetColor = ORANGE;
  let actionVerb = "";
  if (actionType === "hack") actionVerb = "HACKED";
  else if (actionType === "grow") actionVerb = "GREW";
  else if (actionType === "weaken") actionVerb = "WEAKENED";
  else actionVerb = actionType.toUpperCase();
  let report = `
${BOLD}${hostColor}${source}${RESET} ${actionColor}${actionVerb}${RESET} ${targetColor}${before.hostname}${RESET} ${actionIcon}`;
  report += `
  ${GREEN}Threads Used:${RESET} ${CYAN}${threadCount}${RESET}`;
  let durationMs = 0;
  try {
    const parseTime = (t) => {
      const d = /* @__PURE__ */ new Date();
      const [time, ampm] = t.split(" ");
      let [h, m, s] = time.split(":").map(Number);
      if (ampm && ampm.toLowerCase() === "pm" && h < 12) h += 12;
      if (ampm && ampm.toLowerCase() === "am" && h === 12) h = 0;
      d.setHours(h, m, s, 0);
      return d.getTime();
    };
    durationMs = Math.abs(parseTime(after.time) - parseTime(before.time));
  } catch (e) {
    durationMs = 0;
  }
  const totalSeconds = Math.floor(durationMs / 1e3);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  let durationStr = (minutes > 0 ? `${minutes}m ` : "") + `${seconds}s`;
  report += `
  ${GREEN}Action Duration:${RESET} ${CYAN}${durationStr}${RESET}`;
  const moneyChange = after.moneyAvailable - before.moneyAvailable;
  const moneyChangeAbs = Math.abs(moneyChange);
  const moneyChangePct = before.maxMoney > 0 ? (moneyChangeAbs / before.maxMoney * 100).toFixed(2) : "N/A";
  const moneyPerThread = threadCount > 0 ? (moneyChangeAbs / threadCount).toFixed(2) : "N/A";
  if (actionType === "hack") {
    report += `
  ${GREEN}Money Stolen:${RESET} ${CYAN}${formatCurrency(moneyChangeAbs)}${RESET} (${CYAN}${moneyChangePct}%${RESET} of max)`;
    report += `
  ${GREEN}Per Thread:${RESET} ${CYAN}${formatCurrency(moneyPerThread)}${RESET}`;
    report += `
  ${GREEN}Money Remaining:${RESET} ${CYAN}${formatCurrency(after.moneyAvailable)}${RESET} (${CYAN}${(after.moneyAvailable / after.maxMoney * 100).toFixed(2)}%${RESET} of max)`;
  } else if (actionType === "grow") {
    report += `
  ${GREEN}Money Gained:${RESET} ${CYAN}${formatCurrency(moneyChangeAbs)}${RESET} (${CYAN}${moneyChangePct}%${RESET} of max)`;
    report += `
  ${GREEN}Per Thread:${RESET} ${CYAN}${formatCurrency(moneyPerThread)}${RESET}`;
    report += `
  ${GREEN}Total Money:${RESET} ${CYAN}${formatCurrency(after.moneyAvailable)}${RESET} (${CYAN}${(after.moneyAvailable / after.maxMoney * 100).toFixed(2)}%${RESET} of max)`;
  } else if (actionType === "weaken") {
    const secChange = before.securityLevel - after.securityLevel;
    const secChangeAbs = Math.abs(secChange);
    const secPerThread = threadCount > 0 ? (secChangeAbs / threadCount).toFixed(3) : "N/A";
    report += `
  ${GREEN}Security Reduced:${RESET} ${CYAN}${secChangeAbs.toFixed(3)}${RESET}`;
    report += `
  ${GREEN}Per Thread:${RESET} ${CYAN}${secPerThread}${RESET}`;
    report += `
  ${GREEN}New Security Level:${RESET} ${CYAN}${after.securityLevel.toFixed(3)}${RESET}`;
  } else {
    report += `
  ${GREEN}Unknown action type.${RESET}`;
  }
  report += `
  ${GREEN}Growth Stat:${RESET} ${CYAN}${before.growth}${RESET}`;
  report += "\n";
  return report;
}
export {
  generateActionReport,
  takeServerSnapshot
};
