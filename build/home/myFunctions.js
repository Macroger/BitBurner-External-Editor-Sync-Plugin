// servers/home/myFunctions.js
function getBestBotnetTarget(ns) {
  const allServerObjs = scanForAllServers(ns);
  const validServers = getValidServerList(ns, allServerObjs, 1, 1);
  if (validServers.length === 0) return null;
  let best = null;
  let bestScore = -Infinity;
  for (const server of validServers) {
    const maxMoney = ns.getServerMaxMoney(server);
    const growth = ns.getServerGrowth(server);
    const minSec = ns.getServerMinSecurityLevel(server);
    if (maxMoney <= 0 || minSec <= 0) {
      ns.tprintf("Skipping %s: maxMoney=%s, minSec=%s", server, maxMoney, minSec);
      continue;
    }
    const score = maxMoney * growth / minSec;
    ns.tprintf("Candidate %s: maxMoney=%s, growth=%s, minSec=%s, score=%s", server, maxMoney, growth, minSec, score);
    if (score > bestScore) {
      bestScore = score;
      best = server;
      ns.tprintf("New best: %s (score=%s)", server, score);
    }
  }
  ns.tprintf("Optimal botnet target selected: %s (score=%s)", best, bestScore);
  return best;
}
function calculateGrowthRateMultiplier(ns, target) {
  const serverMaxMoney = ns.getServerMaxMoney(target);
  const serverCurrentMoney = ns.getServerMoneyAvailable(target);
  let returnValue = 0;
  if (serverCurrentMoney == 0) {
    returnValue = serverMaxMoney / 100;
  } else {
    returnValue = serverMaxMoney / serverCurrentMoney;
  }
  return returnValue;
}
function ensureScriptExists(ns, script, target) {
  const fileExists = ns.fileExists(script, target);
  let fileTransferResult = true;
  if (fileExists == false) {
    ns.printf("INFO: Detected that the %s file does not exist on %s. Attempting to copy it over now.", script, target);
    fileTransferResult = ns.scp(script, target);
    if (fileTransferResult == true) {
      ns.printf("SUCCESS: Succesfully copied %s to %s", script, target);
    } else {
      ns.printf("ERROR: Failed to copy %s to %s.", script, target);
    }
  }
  return fileTransferResult;
}
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
function displayStats(ns, target) {
  const runningScripts = ns.ps(target);
  ns.tprintf("\n%s found!", target);
  ns.tprintf("Required hacking skill: %s", ns.formatNumber(ns.getServerRequiredHackingLevel(target), 2, 1e3, true));
  ns.tprintf(
    "\nServer security ratings:\n(Min., Base, Current)\n(%s, %s, %s)",
    ns.formatNumber(ns.getServerMinSecurityLevel(target)),
    ns.formatNumber(ns.getServerBaseSecurityLevel(target)),
    ns.formatNumber(ns.getServerSecurityLevel(target))
  );
  ns.tprintf("\nGrowth rate: %d", ns.getServerGrowth(target));
  ns.tprintf("\nGrow time: %d minutes %d seconds.", ns.getGrowTime(target) / 1e3 / 60, ns.getGrowTime(target) / 1e3 % 60);
  ns.tprintf("Weaken time: %d minutes %d seconds.", ns.getWeakenTime(target) / 1e3 / 60, ns.getWeakenTime(target) / 1e3 % 60);
  ns.tprintf("Hack time: %d minutes %d seconds.", ns.getHackTime(target) / 1e3 / 60, ns.getHackTime(target) / 1e3 % 60);
  ns.tprintf("\nMoney available: $%s", ns.formatNumber(ns.getServerMoneyAvailable(target), 2, 1e3, true));
  ns.tprintf("Maximum Money: $%s", ns.formatNumber(ns.getServerMaxMoney(target), 2, 1e3, true));
  ns.tprintf("\nTotal amount of RAM: %s", ns.formatRam(ns.getServerMaxRam(target)));
  ns.tprintf("Amount of free RAM: %s", ns.formatRam(ns.getServerMaxRam(target) - ns.getServerUsedRam(target)));
  ns.tprintf("\nRoot access status: %s", ns.hasRootAccess(target) ? "Granted" : "Not Granted");
  ns.tprintf("Ports required to crack: %d", ns.getServerNumPortsRequired(target));
  if (runningScripts.length == 0) {
    ns.tprintf("Local scripts running: None detected.");
  } else {
    ns.tprintf("Scripts running: ");
    for (let script of runningScripts) {
      ns.tprintf("%s", script.filename);
    }
  }
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
function validateServer(ns, server, minMoney = 1, minGrowRate = 1) {
  let result = false;
  let numCrackingProgramsAvailable = getNumCrackingPrograms(ns);
  let isPlayerHackingSufficient = false;
  const serverHasEnoughMoney = ns.getServerMaxMoney(server) > minMoney ? true : false;
  const playerHackingLevel = ns.getHackingLevel();
  const serverGrowthRate = ns.getServerGrowth(server);
  const canRunNuke = ns.getServerNumPortsRequired(server) <= numCrackingProgramsAvailable ? true : false;
  const serverHackingRequirement = ns.getServerRequiredHackingLevel(server);
  let isGrowthFastEnough = false;
  if (playerHackingLevel >= serverHackingRequirement) {
    isPlayerHackingSufficient = true;
  }
  if (serverGrowthRate >= minGrowRate) {
    isGrowthFastEnough = true;
  }
  if (isPlayerHackingSufficient == true && canRunNuke == true && isGrowthFastEnough == true && serverHasEnoughMoney == true) {
    result = true;
  }
  return result;
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
function scanForServers(ns, startingPoint = "home") {
  let serverList = [];
  const servers = ns.scan(startingPoint);
  for (let target of servers) {
    if (serverList.indexOf(target) === -1) {
      serverList.push(target);
    }
  }
  for (let x of serverList) {
    const newServers = ns.scan(x);
    for (let newServerTarget of newServers) {
      if (serverList.indexOf(newServerTarget) === -1) {
        serverList.push(newServerTarget);
      }
    }
  }
  return serverList;
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
function killScript(ns, scriptName, target = "home") {
  const functionName = "killScript";
  let result = true;
  if (scriptName == "allScripts") {
    ns.printf("[%s]-INFO: Issuing killall command on %s.", functionName, target);
    if (ns.killall(target)) {
      ns.printf("[%s]-SUCCESS: killall command successful on %s.", functionName, target);
      return true;
    } else {
      ns.printf("[%s]-ERROR: killall command failed on %s.", functionName, target);
      return false;
    }
  } else {
    const beforeScripts = ns.ps(target);
    const isRunning = beforeScripts.some((s) => s.filename === scriptName);
    if (!isRunning) {
      ns.printf("[%s]-INFO: %s is not running on %s. Nothing to kill.", functionName, scriptName, target);
      return true;
    }
    const killResult = ns.scriptKill(scriptName, target);
    const afterScripts = ns.ps(target);
    if (killResult) {
      ns.printf("[%s]-SUCCESS: %s successfully killed on %s.", functionName, scriptName, target);
      return true;
    } else {
      ns.printf("[%s]-ERROR: Failed to kill %s on %s, even though it was running.", functionName, scriptName, target);
      return false;
    }
  }
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
export {
  calculateGrowthRateMultiplier,
  decideServerAction,
  displayStats,
  ensureScriptExists,
  formatSleepTime,
  getBestBotnetTarget,
  getNumCrackingPrograms,
  getNumThreadsPossible,
  getNumThreadsToReachGoal,
  getRootAccess,
  getValidServerList,
  killScript,
  launchScriptAttack,
  logWithTimestamp,
  scanForAllServers,
  scanForServers,
  sortQueueByScore,
  validateServer
};
