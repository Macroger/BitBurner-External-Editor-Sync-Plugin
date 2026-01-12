// servers/home/myFunctions.js
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
function logWithTimestamp(ns, message, terminalMode = false) {
  const now = /* @__PURE__ */ new Date();
  const timeStr = now.toTimeString().slice(0, 8);
  if (terminalMode) {
    ns.tprint(`[${timeStr}] ${message}`);
  } else {
    ns.print(`[${timeStr}] ${message}`);
  }
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

// servers/home/uberServerCoordinator.js
async function main(ns) {
  function getHackThreadsToHalf(target) {
    const hackPercent = ns.hackAnalyze(target);
    if (!isFinite(hackPercent) || hackPercent <= 0) return 1;
    let threads = Math.ceil(0.5 / hackPercent);
    if (!isFinite(threads) || threads < 1) threads = 1;
    return Math.min(threads, 1e4);
  }
  function estimateMaxThreads(ns2, target) {
    const growThreads = Math.ceil(
      ns2.growthAnalyze(
        target,
        ns2.getServerMaxMoney(target) / Math.max(ns2.getServerMoneyAvailable(target), 1)
      )
    );
    const hackThreads = Math.ceil(0.25 / ns2.hackAnalyze(target));
    return Math.max(growThreads, hackThreads);
  }
  function sortQueueByBotnetScore(queue2) {
    queue2.sort((a, b) => {
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
  const uberServerAttackerScript = "uberServerAttacker.js";
  const host = ns.getHostname();
  const weakenScript = "local_weaken.js";
  const growScript = "local_grow.js";
  const hackScript = "local_hack.js";
  let running = [];
  let queue = [];
  const maxRam = ns.getServerMaxRam(host);
  const highestAttackScriptRamCost = Math.max(
    ns.getScriptRam(weakenScript, host),
    ns.getScriptRam(growScript, host),
    ns.getScriptRam(hackScript, host)
  );
  const uberServerAttackerRamCost = ns.getScriptRam(uberServerAttackerScript, host);
  let freeRam;
  const allServers = scanForAllServers(ns);
  queue = getValidServerList(ns, allServers, 1, 1, true, false);
  sortQueueByScore(queue);
  freeRam = maxRam - ns.getServerUsedRam(host);
  const yellow = "\x1B[33m";
  const red = "\x1B[31m";
  const green = "\x1B[32m";
  const reset = "\x1B[0m";
  for (const target of queue) {
    const instanceAllocatedThreads = Math.max(1, Math.min(1e4, Math.floor(estimateMaxThreads(ns, target) * 1.2)));
    const maxMoney = ns.getServerMaxMoney(target);
    const growth = ns.getServerGrowth(target);
    const minSec = ns.getServerMinSecurityLevel(target);
    const score = maxMoney > 0 && minSec > 0 ? maxMoney * growth / minSec : -Infinity;
    const ramNeeded = instanceAllocatedThreads * highestAttackScriptRamCost + uberServerAttackerRamCost;
    if (freeRam < ramNeeded) {
      logWithTimestamp(ns, `${yellow}[uberServerCoordinator] WARNING: Not enough RAM to launch instance for ${target} (need ${ns.formatRam(ramNeeded)}, have ${ns.formatRam(freeRam)})${reset}`, true);
      continue;
    }
    const pid = ns.exec(uberServerAttackerScript, host, 1, target, instanceAllocatedThreads);
    if (pid !== 0) {
      running.push({ target, pid, instanceAllocatedThreads, score });
      logWithTimestamp(ns, `${green}[uberServerCoordinator] Launched for ${target}: PID ${pid}, AllocatedThreads ${instanceAllocatedThreads}, Score ${ns.formatNumber(score, 2, 1e3, true)}${reset}`, true);
      freeRam -= ramNeeded;
    } else {
      logWithTimestamp(ns, `${red}[uberServerCoordinator] ERROR: Failed to launch for ${target}${reset}`, true);
    }
  }
  logWithTimestamp(ns, "[uberServerCoordinator] Launch complete. Instances running:", true);
  for (const inst of running) {
    logWithTimestamp(ns, `  Target: ${inst.target} | PID: ${inst.pid} | Threads: ${inst.instanceAllocatedThreads} | Score: ${ns.formatNumber(inst.score, 2, 1e3, true)}`, true);
  }
}
export {
  main
};
