// servers/home/myFunctions.js
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
function getValidServerList(ns, serverList, minMoney = 1, minGrowRate = 1, requiresRAM = false, requiresNoRam = false) {
  let validatedServerList = [];
  const numCrackingProgramsAvailable = getNumCrackingPrograms(ns);
  const playerHackingLevel = ns.getHackingLevel();
  for (let target of serverList) {
    let targetName = target.name;
    const serverHasRam = ns.getServerMaxRam(targetName) > 0 ? true : false;
    const serverHasEnoughMoney = ns.getServerMaxMoney(targetName) > minMoney ? true : false;
    const serverGrowthRate = ns.getServerGrowth(targetName);
    const canRunNuke = ns.getServerNumPortsRequired(targetName) <= numCrackingProgramsAvailable ? true : false;
    const serverHackingRequirement = ns.getServerRequiredHackingLevel(targetName);
    let isPlayerHackingSufficient = playerHackingLevel >= serverHackingRequirement ? true : false;
    let isGrowthFastEnough = serverGrowthRate >= minGrowRate ? true : false;
    if (isPlayerHackingSufficient == true && canRunNuke == true && isGrowthFastEnough == true && serverHasEnoughMoney == true) {
      if (requiresRAM == true && requiresNoRam == true) {
        validatedServerList.push(targetName);
      } else if (requiresRAM == true) {
        if (serverHasRam == true) {
          validatedServerList.push(targetName);
        }
      } else if (requiresNoRam == true) {
        if (serverHasRam == false) {
          validatedServerList.push(targetName);
        }
      } else {
        validatedServerList.push(targetName);
      }
    }
  }
  return validatedServerList;
}
function scanForAllServers(ns, startingPoint = "home") {
  const serverMap = /* @__PURE__ */ new Map();
  const queue = [];
  serverMap.set(startingPoint, { name: startingPoint, scanned: false, parent: null });
  queue.push(startingPoint);
  while (queue.length > 0) {
    const current = queue.shift();
    const serverObj = serverMap.get(current);
    if (!serverObj.scanned) {
      const neighbors = ns.scan(current);
      for (const neighbor of neighbors) {
        if (!serverMap.has(neighbor)) {
          serverMap.set(neighbor, { name: neighbor, scanned: false, parent: current });
          queue.push(neighbor);
        }
      }
      serverObj.scanned = true;
    }
  }
  return Array.from(serverMap.values());
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
function sortQueueByScore(ns, queue) {
  queue.sort((a, b) => {
    const aName = a.name || a;
    const bName = b.name || b;
    const aMaxMoney = ns.getServerMaxMoney(aName);
    const aGrowth = ns.getServerGrowth(aName);
    const aMinSec = ns.getServerMinSecurityLevel(aName);
    const aScore = aMaxMoney > 0 && aMinSec > 0 ? aMaxMoney * aGrowth / aMinSec : -Infinity;
    const bMaxMoney = ns.getServerMaxMoney(bName);
    const bGrowth = ns.getServerGrowth(bName);
    const bMinSec = ns.getServerMinSecurityLevel(bName);
    const bScore = bMaxMoney > 0 && bMinSec > 0 ? bMaxMoney * bGrowth / bMinSec : -Infinity;
    return bScore - aScore;
  });
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

// servers/home/centralizedRamAttackManager.js
async function main(ns) {
  ns.disableLog("ALL");
  function resetAttacker(attacker) {
    attacker.requiredThreads = 0;
    attacker.requiredRam = 0;
    attacker.pid = 0;
    attacker.activeScript = "";
    attacker.wakeupTime = Date.now();
    attacker.status = "pending";
    attacker.priorityScore = 0;
    attacker.currentMode = "init";
    attacker.beforeSnapshot = null;
    attacker.afterSnapshot = null;
  }
  let targetQueue = getValidServerList(ns, scanForAllServers(ns), 1, 1, true, true);
  const host = ns.getHostname();
  const maxRam = ns.getServerMaxRam(host);
  const weakenScript = "local_weaken.js";
  const growScript = "local_grow.js";
  const hackScript = "local_hack.js";
  let loopCounter = 0;
  let attackers = [];
  let attackersRequiringAction = [];
  while (true) {
    if (loopCounter % 10 === 0) {
      ns.print(`



`);
      const colorLabel = "\x1B[38;5;39m";
      const colorValue = "\x1B[38;5;226m";
      const colorHeader = "\x1B[38;5;51m";
      const colorReset = "\x1B[0m";
      ns.print(`${colorHeader}[centralizedRamAttackManager]  ==========================================================${colorReset}`);
      ns.print(`${colorHeader}[centralizedRamAttackManager] SUCCESS: Starting main loop iteration ${colorValue}${loopCounter}${colorReset} on host ${colorValue}${host}${colorReset}`);
      const runningAttackers = attackers.filter((a) => a.status === "running");
      const pendingAttackers = attackers.filter((a) => a.status === "pending");
      const totalThreads = runningAttackers.reduce((sum, a) => sum + a.requiredThreads, 0);
      ns.printf(
        `${colorLabel}[centralizedRamAttackManager] RAM:${colorReset} ${colorLabel}Used${colorReset} ${colorValue}%s${colorReset} ${colorLabel}/ Max${colorReset} ${colorValue}%s${colorReset} ${colorLabel}| Free:${colorReset} ${colorValue}%s${colorReset} ${colorLabel}| Running:${colorReset} ${colorValue}%d${colorReset} ${colorLabel}| Pending:${colorReset} ${colorValue}%d${colorReset} ${colorLabel}| Total Threads Used:${colorReset} ${colorValue}%d${colorReset}`,
        ns.formatRam(ns.getServerUsedRam(host)),
        ns.formatRam(maxRam),
        ns.formatRam(maxRam - ns.getServerUsedRam(host)),
        runningAttackers.length,
        pendingAttackers.length,
        totalThreads
      );
      ns.print(`
`);
      ns.printf(
        `${colorHeader}[centralizedRamAttackManager] %-18s %-8s %-10s %-10s %-10s %-10s %-10s %-10s${colorReset}`,
        "Target",
        "Status",
        "Mode",
        "Threads",
        "RAM",
        "PID",
        "Wakeup",
        "Priority"
      );
      for (const attacker of attackers) {
        let targetName = typeof attacker.target === "string" ? attacker.target : attacker.target && attacker.target.name ? attacker.target.name : "<unknown>";
        let wakeupIn = attacker.status === "running" ? Math.max(0, Math.round((attacker.wakeupTime - Date.now()) / 1e3)) + "s" : "-";
        ns.printf(
          `${colorLabel}[centralizedRamAttackManager]${colorReset} ${colorValue}%-18s${colorReset} ${colorValue}%-8s${colorReset} ${colorValue}%-10s${colorReset} ${colorValue}%-10d${colorReset} ${colorValue}%-10s${colorReset} ${colorValue}%-10d${colorReset} ${colorValue}%-10s${colorReset} ${colorValue}%-10d${colorReset}`,
          targetName,
          attacker.status,
          attacker.currentMode,
          attacker.requiredThreads,
          ns.formatRam(attacker.requiredRam),
          attacker.pid || 0,
          wakeupIn,
          attacker.priorityScore
        );
      }
    }
    let usedRam = ns.getServerUsedRam(host);
    let freeRam = maxRam - usedRam;
    if (loopCounter % 120 === 0) {
      targetQueue = getValidServerList(ns, scanForAllServers(ns), 1, 1, true, false);
      sortQueueByScore(ns, targetQueue);
      loopCounter = 0;
      for (const target of targetQueue) {
        if (!target) {
          continue;
        }
        const already = attackers.find((a) => a.target === target);
        if (already) {
          continue;
        }
        let newAttacker = {
          activeScript: "",
          target,
          requiredThreads: 0,
          requiredRam: 0,
          pid: 0,
          wakeupTime: Date.now(),
          // timestamp to wake up - for when processing an action
          status: "pending",
          // 'running' | 'pending' | 'finished'
          priorityScore: 0,
          // priority/score based on the botnet scoring method
          currentMode: "init",
          // 'hack' | 'grow' | 'weaken' | 'init'
          beforeSnapshot: null,
          afterSnapshot: null,
          lastReport: ""
        };
        attackers.push(newAttacker);
      }
    }
    attackersRequiringAction = [];
    for (const attacker of attackers) {
      if (attacker.status === "running" && attacker.wakeupTime <= Date.now()) {
        attacker.afterSnapshot = takeServerSnapshot(ns, attacker.target);
        if (attacker.beforeSnapshot && attacker.afterSnapshot) {
          attacker.lastReport = generateActionReport(
            attacker.beforeSnapshot,
            attacker.afterSnapshot,
            attacker.currentMode,
            attacker.requiredThreads,
            host
            // or whatever you want as the source
          );
          attacker.beforeSnapshot = null;
          attacker.afterSnapshot = null;
        }
        resetAttacker(attacker);
        attackersRequiringAction.push(attacker);
      } else if (attacker.status === "pending") {
        attackersRequiringAction.push(attacker);
      } else {
        continue;
      }
    }
    for (const attacker of attackersRequiringAction) {
      if (attacker.currentMode !== "init") {
        continue;
      }
      const action = decideServerAction(ns, attacker.target, host);
      let requiredThreads = 0;
      let goal = 0;
      if (action === "weaken") {
        attacker.activeScript = weakenScript;
        attacker.currentMode = "weaken";
        goal = ns.getServerMinSecurityLevel(attacker.target);
        requiredThreads = getNumThreadsToReachGoal(ns, attacker.activeScript, goal, attacker.target, host);
      } else if (action === "grow") {
        attacker.activeScript = growScript;
        attacker.currentMode = "grow";
        goal = ns.getServerMaxMoney(attacker.target);
        requiredThreads = getNumThreadsToReachGoal(ns, attacker.activeScript, goal, attacker.target, host);
      } else if (action === "hack") {
        attacker.activeScript = hackScript;
        attacker.currentMode = "hack";
        goal = ns.getServerMoneyAvailable(attacker.target) - ns.getServerMaxMoney(attacker.target) * 0.75;
        requiredThreads = getNumThreadsToReachGoal(ns, attacker.activeScript, goal, attacker.target, host);
      } else {
        resetAttacker(attacker);
        continue;
      }
      attacker.requiredThreads = requiredThreads;
      const scriptRam = ns.getScriptRam(attacker.activeScript, host);
      attacker.requiredRam = requiredThreads * scriptRam;
      const idx = targetQueue.findIndex((t) => t === attacker.target);
      if (idx !== -1) {
        ns.print(`[centralizedRamAttackManager] INFO: Calculating priority score for target ${attacker.target} at index ${idx}.`);
        attacker.priorityScore = targetQueue.length - idx;
      }
    }
    attackersRequiringAction.sort((a, b) => b.priorityScore - a.priorityScore);
    for (const attacker of attackersRequiringAction) {
      if (attacker.status !== "pending") {
        continue;
      }
      freeRam = maxRam - ns.getServerUsedRam(host);
      if (attacker.requiredRam <= freeRam && attacker.requiredThreads > 0) {
        attacker.beforeSnapshot = takeServerSnapshot(ns, attacker.target);
        const pid = ns.exec(
          attacker.activeScript,
          host,
          attacker.requiredThreads,
          attacker.target
        );
        attacker.pid = pid;
        attacker.status = "running";
        attacker.wakeupTime = Date.now() + (attacker.currentMode === "weaken" ? ns.getWeakenTime(attacker.target) : attacker.currentMode === "grow" ? ns.getGrowTime(attacker.target) : ns.getHackTime(attacker.target)) + 150;
        const formattedTime = formatSleepTime(attacker.wakeupTime - Date.now());
      } else if (attacker.requiredRam > freeRam && attacker.requiredThreads > 0) {
        const scriptRam = ns.getScriptRam(attacker.activeScript, host);
        if (freeRam / scriptRam >= 1) {
          const maxThreadsPossible = Math.floor(freeRam / scriptRam);
          if (maxThreadsPossible > 0) {
            attacker.beforeSnapshot = takeServerSnapshot(ns, attacker.target);
            const pid = ns.exec(
              attacker.activeScript,
              host,
              maxThreadsPossible,
              attacker.target
            );
            attacker.pid = pid;
            attacker.requiredThreads = maxThreadsPossible;
            attacker.requiredRam = maxThreadsPossible * scriptRam;
            attacker.status = "running";
            attacker.wakeupTime = Date.now() + (attacker.currentMode === "weaken" ? ns.getWeakenTime(attacker.target) : attacker.currentMode === "grow" ? ns.getGrowTime(attacker.target) : ns.getHackTime(attacker.target)) + 150;
            const formattedTime = formatSleepTime(attacker.wakeupTime - Date.now());
          }
        } else {
          break;
        }
      }
    }
    const running = ns.ps(host);
    for (const attacker of attackers) {
      if (attacker.status === "running" && !running.find((s) => s.pid === attacker.pid)) {
        resetAttacker(attacker);
      }
    }
    await ns.sleep(1e3);
    loopCounter++;
  }
}
export {
  main
};
