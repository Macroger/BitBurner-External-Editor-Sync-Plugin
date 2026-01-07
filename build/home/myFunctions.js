// servers/home/myFunctions.js
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
  ns.printf("[%s]-INFO: determined that %d can be opened.", functionName, numThreads);
  if (reserveThreads > 0) {
    ns.printf("[%s]-WARN: Detected reserve thread count of %d. Reducing thread count by this amount.", functionName, reserveThreads);
    numThreads = numThreads - reserveThreads;
  }
  return numThreads;
}
function launchScriptAttack(ns, scriptName, target, source, goal, reserveThreads = 0, localMode = false) {
  const sectionName = "launchScriptAttack";
  let functionResult = false;
  let numThreadsAvailable = 0;
  const desiredNumThreads = getNumThreadsToReachGoal(ns, scriptName, goal, target);
  if (localMode == true) {
    numThreadsAvailable = getNumThreadsPossible(ns, scriptName, source, reserveThreads);
  } else {
    numThreadsAvailable = getNumThreadsPossible(ns, scriptName, target, reserveThreads);
  }
  ns.printf("[%s]-INFO: Goal value: %d, script: %s ", sectionName, goal, scriptName);
  ns.printf("[%s]-INFO: Determined %d threads required to get to goal on %s.", sectionName, desiredNumThreads, target);
  if (desiredNumThreads < numThreadsAvailable) {
    const result = ns.exec(scriptName, source, desiredNumThreads, target);
    if (result == 0) {
      ns.printf("[%s]-ERROR: Starting of script %s failed.\nAttempted to open %d threads.", sectionName, scriptName, desiredNumThreads);
    } else {
      ns.printf("[%s]-INFO: Successfully opened up %d threads of %s on %s", sectionName, desiredNumThreads, scriptName, source);
      functionResult = true;
    }
  } else {
    if (numThreadsAvailable > 0) {
      const result = ns.exec(scriptName, source, numThreadsAvailable, target);
      if (result == 0) {
        ns.printf("[%s]-ERROR: Starting of script %s failed.\nAttempted to open %d threads.", sectionName, scriptName, numThreadsAvailable);
      } else {
        ns.printf("[%s]-INFO: Successfully opened up %d threads of %s on %s", sectionName, numThreadsAvailable, scriptName, source);
        functionResult = true;
      }
    } else {
      ns.printf("[%s]-WARN: Not enough RAM available to open any threads on %s.", sectionName, target);
    }
  }
  return functionResult;
}
function getNumThreadsToReachGoal(ns, scriptName, goal, target, source = "remote") {
  const sectionName = "getNumThreadsToReachGoal";
  let server = source == "remote" ? ns.getServer(target) : ns.getServer(source);
  const serverCpuCount = server.cpuCores;
  const weakenScriptName = "weaken.js";
  const hackScriptName = "hack.js";
  const growScriptName = "grow.js";
  ns.printf("[%s]-INFO: Goal: %d", sectionName, goal);
  let threadsRequired = 0;
  if (scriptName == weakenScriptName) {
    const valueOfOneWeaken = ns.weakenAnalyze(1, serverCpuCount);
    const serverDecreaseRequired = ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target);
    ns.printf("[%s]-INFO: value of server decrease required: %d", sectionName, serverDecreaseRequired);
    threadsRequired = serverDecreaseRequired / valueOfOneWeaken;
  } else if (scriptName == hackScriptName) {
    threadsRequired = ns.hackAnalyzeThreads(target, goal);
  } else if (scriptName == growScriptName) {
    threadsRequired = ns.growthAnalyze(target, goal, serverCpuCount);
  }
  const result = Math.ceil(threadsRequired);
  ns.printf("[%s]-INFO: Number of threads required to reach goal: %d", sectionName, result);
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
    const serverHasRam = ns.getServerMaxRam(target) > 0 ? true : false;
    const serverHasEnoughMoney = ns.getServerMaxMoney(target) > minMoney ? true : false;
    const serverGrowthRate = ns.getServerGrowth(target);
    const canRunNuke = ns.getServerNumPortsRequired(target) <= numCrackingProgramsAvailable ? true : false;
    const serverHackingRequirement = ns.getServerRequiredHackingLevel(target);
    let isPlayerHackingSufficient = playerHackingLevel >= serverHackingRequirement ? true : false;
    let isGrowthFastEnough = serverGrowthRate >= minGrowRate ? true : false;
    if (isPlayerHackingSufficient == true && canRunNuke == true && isGrowthFastEnough == true && serverHasEnoughMoney == true) {
      if (requiresRAM == true && requiresNoRam == true) {
        validatedServerList.push(target);
      } else if (requiresRAM == true) {
        if (serverHasRam == true) {
          validatedServerList.push(target);
        }
      } else if (requiresNoRam == true) {
        if (serverHasRam == false) {
          validatedServerList.push(target);
        }
      } else {
        validatedServerList.push(target);
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
export {
  calculateGrowthRateMultiplier,
  displayStats,
  ensureScriptExists,
  getNumCrackingPrograms,
  getNumThreadsPossible,
  getNumThreadsToReachGoal,
  getRootAccess,
  getValidServerList,
  launchScriptAttack,
  scanForAllServers,
  scanForServers,
  validateServer
};
