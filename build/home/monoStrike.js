// servers/home/myFunctions.js
function getRootAccess(ns, target) {
  const portsRequired = ns.getServerNumPortsRequired(target);
  let nukeRequired = false;
  const numCrackingProgramsAvailable = getNumCrackingPrograms(ns);
  if (portsRequired <= numCrackingProgramsAvailable) {
    switch (portsRequired) {
      case 5:
        ns.sqlinject(target);
      case 4:
        ns.httpworm(target);
      case 3:
        ns.relaysmtp(target);
      case 2:
        ns.ftpcrack(target);
      case 1:
        ns.brutessh(target);
      case 0:
        nukeRequired = true;
    }
  }
  if (nukeRequired == true) {
    ns.nuke(target);
    ns.printf("INFO: Nuke performed. Root access should now be granted.");
  }
  return ns.hasRootAccess(target);
}
function getNumThreadsPossible(ns, scriptName, target, reserveThreads = 0) {
  const functionName = "getNumThreadsPossible";
  const serverAvailableRam = ns.getServerMaxRam(target) - ns.getServerUsedRam(target);
  const scriptRamCost = ns.getScriptRam(scriptName);
  let numThreads = 0;
  const maxThreadCount = 1e6;
  if (serverAvailableRam >= scriptRamCost) {
    numThreads = Math.floor(serverAvailableRam / scriptRamCost);
    if (numThreads < 1) {
      ns.printf("[%s]-ERROR: Unable to open any threads. Skipping this target for now - but %s requires investigation.", functionName, target);
      numThreads = 0;
    } else if (numThreads > maxThreadCount) {
      ns.printf("[%s]-ERROR: Too many threads suggested.(t = %d).", functionName, numThreads);
      numThreads = 0;
    }
  }
  if (reserveThreads > 0) {
    ns.printf("[%s]-WARN: Detected reserve thread count of %d. Reducing thread count by this amount.", functionName, reserveThreads);
    numThreads = numThreads - reserveThreads;
  }
  return numThreads;
}
function launchScriptAttack(ns, scriptName, target, source, goal, maxAllowedThreads = 1e4, reserveThreads = 0, localMode = false) {
  const sectionName = "launchScriptAttack";
  let numThreadsAvailable = 0;
  const desiredNumThreads = getNumThreadsToReachGoal(ns, scriptName, goal, target);
  let resultObj = {
    success: false,
    threadCount: 0,
    ramUsed: 0,
    script: scriptName,
    target,
    error: null,
    pid: null
  };
  if (localMode == true) {
    numThreadsAvailable = getNumThreadsPossible(ns, scriptName, source, reserveThreads);
  } else {
    numThreadsAvailable = getNumThreadsPossible(ns, scriptName, target, reserveThreads);
  }
  if (desiredNumThreads === 0) {
    ns.printf("[%s]-INFO: No threads needed for %s on %s (goal already met or calculation returned zero). Skipping launch.", sectionName, scriptName, target);
    resultObj.error = "No threads needed (goal met or zero calculation)";
    return resultObj;
  }
  let threadsToLaunch = 0;
  if (desiredNumThreads > 0 && desiredNumThreads < numThreadsAvailable) {
    threadsToLaunch = desiredNumThreads;
  } else if (numThreadsAvailable > 0) {
    threadsToLaunch = numThreadsAvailable;
  } else {
    ns.printf("[%s]-WARN: Not enough RAM available to open any threads on %s.", sectionName, target);
    resultObj.error = "Not enough RAM available";
    return resultObj;
  }
  if (threadsToLaunch > maxAllowedThreads) {
    ns.printf("[%s]-WARN: Capping threads to launch (%d) to max allowed (%d).", sectionName, threadsToLaunch, maxAllowedThreads);
    threadsToLaunch = maxAllowedThreads;
  }
  const pid = ns.exec(scriptName, source, threadsToLaunch, target);
  if (pid === 0) {
    ns.printf("[%s]-ERROR: Starting of script %s failed.\nAttempted to open %d threads.", sectionName, scriptName, threadsToLaunch);
    resultObj.error = `Script launch failed for ${scriptName} with ${threadsToLaunch} threads.`;
    return resultObj;
  } else {
    const maxRam = ns.getServerMaxRam(source);
    const ramUsed = threadsToLaunch * ns.getScriptRam(scriptName, source);
    ns.printf("[%s]-SUCCESS: Opened %d threads of %s on %s, using %s / %s RAM ", sectionName, threadsToLaunch, scriptName, source, ns.formatRam(ramUsed), ns.formatRam(maxRam));
    resultObj.success = true;
    resultObj.threadCount = threadsToLaunch;
    resultObj.ramUsed = ramUsed;
    resultObj.pid = pid;
    return resultObj;
  }
}
function getNumThreadsToReachGoal(ns, scriptName, goal, target, source = "remote") {
  const sectionName = "getNumThreadsToReachGoal";
  let server = source == "remote" ? ns.getServer(target) : ns.getServer(source);
  const serverCpuCount = server.cpuCores;
  const localPrefix = "local_";
  const weakenScriptName = localPrefix + "weaken.js";
  const hackScriptName = localPrefix + "hack.js";
  const growScriptName = localPrefix + "grow.js";
  let threadsRequired = 0;
  const THREAD_CAP = 1e4;
  if (scriptName == weakenScriptName) {
    const valueOfOneWeaken = ns.weakenAnalyze(1, serverCpuCount);
    const serverDecreaseRequired = ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target);
    threadsRequired = serverDecreaseRequired / valueOfOneWeaken;
  } else if (scriptName == hackScriptName) {
    threadsRequired = ns.hackAnalyzeThreads(target, goal);
  } else if (scriptName == growScriptName) {
    let safeGoal = Math.max(goal, 1);
    threadsRequired = ns.growthAnalyze(target, safeGoal, serverCpuCount);
    if (threadsRequired > THREAD_CAP) {
      ns.printf("[%s]-WARN: Calculated grow threads (%d) exceeds cap (%d) for %s. Capping to %d.", sectionName, threadsRequired, THREAD_CAP, target, THREAD_CAP);
      threadsRequired = THREAD_CAP;
    }
  } else {
    ns.printf("[%s]-ERROR: Unknown script name %s provided for thread calculation on %s.", sectionName, scriptName, target);
    threadsRequired = 0;
  }
  let result = Math.ceil(threadsRequired);
  if (result > THREAD_CAP) {
    ns.printf("[%s]-WARN: Calculated threads (%d) exceeds cap (%d) for %s. Capping to %d.", sectionName, result, THREAD_CAP, target, THREAD_CAP);
    result = THREAD_CAP;
  }
  ns.printf("[%s]-INFO: Number of threads required to reach goal of %d on %s: %d", sectionName, goal, target, result);
  return result;
}
function getNumCrackingPrograms(ns) {
  let numCrackingProgramsAvailable = 0;
  if (ns.fileExists("bruteSSH.exe", "home")) {
    numCrackingProgramsAvailable++;
  }
  if (ns.fileExists("relaySMTP.exe", "home")) {
    numCrackingProgramsAvailable++;
  }
  if (ns.fileExists("FTPCrack.exe", "home")) {
    numCrackingProgramsAvailable++;
  }
  if (ns.fileExists("SQLInject.exe", "home")) {
    numCrackingProgramsAvailable++;
  }
  if (ns.fileExists("HTTPWorm.exe", "home")) {
    numCrackingProgramsAvailable++;
  }
  return numCrackingProgramsAvailable;
}
function decideServerAction(ns, target, source = target) {
  let minSec = ns.getServerMinSecurityLevel(target);
  let curSec = ns.getServerSecurityLevel(target);
  let maxMoney = ns.getServerMaxMoney(target);
  let curMoney = ns.getServerMoneyAvailable(target);
  const weakenThreshold = Math.max(minSec * 1.05, minSec + 2);
  if (curSec > weakenThreshold) {
    const cpuCores = ns.getServer(source).cpuCores || 1;
    const weakenEffect = ns.weakenAnalyze(1, cpuCores);
    if (curSec - minSec >= weakenEffect) {
      return "weaken";
    }
  }
  if (curMoney >= maxMoney * 0.95) {
    return "hack";
  }
  return "grow";
}

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

// servers/home/monoStrike.js
function logWithTimestamp(ns, message) {
  const now = /* @__PURE__ */ new Date();
  const timeStr = now.toTimeString().slice(0, 8);
  ns.print(`[${timeStr}] ${message}`);
}
function formatSleepTime(ms) {
  const totalSeconds = Math.floor(ms / 1e3);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  let result = "";
  if (minutes > 0) result += `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  if (minutes > 0 && seconds > 0) result += " ";
  if (seconds > 0) result += `${seconds} second${seconds !== 1 ? "s" : ""}`;
  if (result === "") result = "less than 1 second";
  return result;
}
async function main(ns) {
  ns.disableLog("ALL");
  if (ns.args.length < 1 || ns.args.length > 2) {
    logWithTimestamp(ns, `[${selfName}] ERROR: Usage: run monoStrike.js [target] [reserveThreads=0]`);
    ns.exit();
  }
  const reserveThreads = ns.args.length > 1 ? Number(ns.args[1]) : 0;
  if (isNaN(reserveThreads) || reserveThreads < 0) {
    logWithTimestamp(ns, `[${selfName}] ERROR: reserveThreads must be a non-negative integer.`);
    ns.exit();
  }
  const selfName = "monoStrike";
  const target = ns.args[0];
  const thisServer = ns.getServer().hostname;
  const fallbackSleepFraction = 0.33;
  const weakenScript = "local_weaken.js";
  const growScript = "local_grow.js";
  const hackScript = "local_hack.js";
  if (!ns.hasRootAccess(target)) {
    logWithTimestamp(ns, `[${selfName}] INFO: Attempting to gain root access to ${target}...`);
    if (!getRootAccess(ns, target)) {
      logWithTimestamp(ns, `[${selfName}] ERROR: Could not gain root access to ${target}. Exiting.`);
      ns.exit();
    } else {
      logWithTimestamp(ns, `[${selfName}] SUCCESS: Root access obtained for ${target}.`);
    }
  }
  logWithTimestamp(ns, `[${selfName}] SUCCESS: Starting attack loop on ${target} from ${thisServer}`);
  while (true) {
    const action = decideServerAction(ns, target);
    const minSec = ns.getServerMinSecurityLevel(target);
    const curSec = ns.getServerSecurityLevel(target);
    const maxMoney = ns.getServerMaxMoney(target);
    const curMoney = ns.getServerMoneyAvailable(target);
    let hackPreMoney = null;
    let growPreMoney = null;
    let script, goal;
    if (action === "weaken") {
      script = weakenScript;
      goal = minSec > 0 ? minSec : 1;
      const secPercent = (curSec / goal * 100).toFixed(1);
      logWithTimestamp(ns, `[${selfName}] INFO: Decided to WEAKEN ${target}; Server Security: ${curSec.toFixed(1)} / ${goal.toFixed(1)} = ${secPercent}%`);
    } else if (action === "grow") {
      script = growScript;
      goal = maxMoney / Math.max(curMoney, 1);
      growPreMoney = curMoney;
      logWithTimestamp(ns, `[${selfName}] INFO: Decided to GROW ${target}; Server Money: $${ns.formatNumber(curMoney)} / $${ns.formatNumber(maxMoney)}`);
    } else if (action === "hack") {
      script = hackScript;
      goal = curMoney;
      const moneyPercent = (curMoney / maxMoney * 100).toFixed(1);
      hackPreMoney = curMoney;
      logWithTimestamp(ns, `[${selfName}] INFO: Decided to HACK ${target}; Server Money: $${ns.formatNumber(curMoney)} / $${ns.formatNumber(maxMoney)} (${moneyPercent}% available)`);
    } else {
      logWithTimestamp(ns, `[${selfName}] WARN: No valid action for ${target}. Sleeping.`);
      await ns.sleep(defaultSleep);
      continue;
    }
    const runningScripts = ns.ps(thisServer).filter((s) => s.filename === script && s.args[0] === target);
    let actionSleepTime = 0;
    if (script === weakenScript) actionSleepTime = ns.getWeakenTime(target);
    else if (script === growScript) actionSleepTime = ns.getGrowTime(target);
    else if (script === hackScript) actionSleepTime = ns.getHackTime(target);
    if (runningScripts.length > 0) {
      const fallbackSleepMs = Math.max(250, Math.floor(actionSleepTime * fallbackSleepFraction));
      logWithTimestamp(ns, `[${selfName}] INFO: Detected ${script} already running on ${target}. Sleeping for ${formatSleepTime(fallbackSleepMs)}.`);
      await ns.sleep(fallbackSleepMs);
      continue;
    }
    const preSnapshot = takeServerSnapshot(ns, target);
    const attackResult = launchScriptAttack(
      ns,
      // NS object
      script,
      // Script to run
      target,
      // Target server
      thisServer,
      // Server to run the script on (home)
      goal,
      // Goal for the action
      reserveThreads,
      // Reserve threads on home
      true
      // localMode: Run scripts locally on home
    );
    if (attackResult.success == false) {
      if (attackResult.reason === "Not enough RAM available") {
        const fallbackSleepMs = Math.max(250, Math.floor(actionSleepTime * fallbackSleepFraction));
        logWithTimestamp(ns, `[${selfName}] WARN: Not enough RAM to run ${script} on ${target}. Sleeping for ${formatSleepTime(fallbackSleepMs)}.`);
        await ns.sleep(fallbackSleepMs);
        continue;
      } else {
        logWithTimestamp(ns, `[${selfName}] ERROR: Attack on ${target} failed due to unknown reason: ${attackResult.reason}.`);
        continue;
      }
    }
    let sleepTime = 0;
    if (script === weakenScript) sleepTime = ns.getWeakenTime(target);
    else if (script === growScript) sleepTime = ns.getGrowTime(target);
    else if (script === hackScript) sleepTime = ns.getHackTime(target);
    const sleepBuffer = 250;
    let sleepMs = sleepTime + sleepBuffer;
    logWithTimestamp(ns, `[${selfName}] INFO: Sleeping for ${formatSleepTime(sleepMs)} after running ${script} on ${target}.`);
    await ns.sleep(sleepMs);
    const threadCount = attackResult.threadCount;
    const postSnapshot = takeServerSnapshot(ns, target);
    const actionReport = generateActionReport(preSnapshot, postSnapshot, action, threadCount, thisServer);
    logWithTimestamp(ns, actionReport);
  }
}
export {
  main
};
