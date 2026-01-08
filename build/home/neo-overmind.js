// servers/home/myFunctions.js
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
  const localPrefix = "local_";
  const weakenScriptName = localPrefix + "weaken.js";
  const hackScriptName = localPrefix + "hack.js";
  const growScriptName = localPrefix + "grow.js";
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
function getValidServerList(ns, serverList, minMoney2 = 1, minGrowRate = 1, requiresRAM = false, requiresNoRam = false) {
  let validatedServerList = [];
  const numCrackingProgramsAvailable = getNumCrackingPrograms(ns);
  const playerHackingLevel = ns.getHackingLevel();
  for (let target of serverList) {
    let targetName = target.name;
    const serverHasRam = ns.getServerMaxRam(targetName) > 0 ? true : false;
    const serverHasEnoughMoney = ns.getServerMaxMoney(targetName) > minMoney2 ? true : false;
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
function decideServerAction(ns, target) {
  let minSec2 = ns.getServerMinSecurityLevel(target);
  let curSec = ns.getServerSecurityLevel(target);
  let maxMoney2 = ns.getServerMaxMoney(target);
  let curMoney = ns.getServerMoneyAvailable(target);
  const weakenThreshold = minSec2 * 1.05;
  const growThreshold = maxMoney2 * 0.75;
  const hackThreshold = maxMoney2 * 0.92;
  if (curSec > weakenThreshold) {
    mode = "weaken";
  } else if (curMoney < growThreshold) {
    mode = "grow";
  } else if (curMoney >= hackThreshold) {
    mode = "hack";
  }
  return mode;
}
function killScript(ns, scriptName, target = "home") {
  const functionName = "killScript";
  ns.printf("[%s]-INFO: Attempting to kill %s on %s.", functionName, scriptName, target);
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
    ns.printf("[%s]-INFO: Looking for %s running on %s.", functionName, scriptName, target);
    const runningScripts = ns.ps(target);
    ns.printf("[%s]-INFO: Found %d scripts running on %s.", functionName, runningScripts.length, target);
    for (let script of runningScripts) {
      if (script.filename == scriptName) {
        ns.printf("[%s]-INFO: Detected %s running on %s. Issuing kill command.", functionName, scriptName, target);
        if (ns.kill(scriptName, target)) {
          ns.printf("[%s]-SUCCESS: %s successfully killed on %s.", functionName, scriptName, target);
        } else {
          ns.printf("[%s]-ERROR: Failed to kill %s on %s.", functionName, scriptName, target);
          result = false;
        }
      }
    }
    return result;
  }
}

// servers/home/neo-overmind.js
async function main(ns) {
  const selfName = "neo-overmind.js";
  const weakenScript = "local_weaken.js";
  const growScript = "local_grow.js";
  const hackScript = "local_hack.js";
  const scripts = [weakenScript, growScript, hackScript];
  const sleepTime = 500;
  let serverStates = {};
  let scanCounter = 0;
  let validatedServersList = getValidServerList(ns, scanForAllServers(ns), 1, 1, true, false);
  while (true) {
    if (scanCounter >= 10) {
      scanCounter = 0;
      validatedServersList = getValidServerList(ns, scanForAllServers(ns), 1, 1, true, false);
    }
    scanCounter++;
    for (let target of validatedServersList) {
      if (!(target in serverStates)) {
        serverStates[target] = {
          phase: "analyze",
          nextAction: Date.now(),
          setupComplete: false,
          hasError: false
        };
      }
      if (serverStates[target].hasError == true) {
        continue;
      }
      if (serverStates[target].setupComplete == false) {
        ns.printf("[%s]-INFO: Performing first time setup for server %s...", selfName, target);
        if (ns.hasRootAccess(target) == false) {
          const rootAccess = getRootAccess(ns, target);
          if (rootAccess == false) {
            ns.printf("[%s]-ERROR: %s remains uncracked. Check error logs, root access remains denied. Continuing to next server.", selfName, target);
            serverStates[target].hasError = true;
            continue;
          }
        }
        for (const script of scripts) {
          if (ensureScriptExists(ns, script, target) == false) {
            ns.printf("ERROR: Unable to verify %s exists on %s. This server needs to be investigated for issues.", script, target);
            serverStates[target].hasError = true;
            break;
          }
          if (killScript(ns, script, target) == false) {
            ns.printf("ERROR: Unable to kill existing %s on %s. Skipping to next target server.", script, target);
            serverStates[target].hasError = true;
            break;
          }
        }
        serverStates[target].setupComplete = true;
        ns.printf("[%s]-SUCCESS: Setup complete for server %s. All required scripts verified and no scripts running.", selfName, target);
      }
      if (Date.now() >= serverStates[target].nextAction) {
        const action = decideServerAction(ns, target);
        switch (action) {
          case "weaken":
            launchScriptAttack(ns, weakenScript, target, target, minSec);
            const actionCooldown = ns.getWeakenTime(target);
            serverStates[target].nextAction = Date.now() + actionCooldown;
            break;
          case "grow":
            launchScriptAttack(ns, growScript, target, target, maxMoney);
            const growCooldown = ns.getGrowTime(target);
            serverStates[target].nextAction = Date.now() + growCooldown;
            break;
          case "hack":
            launchScriptAttack(ns, hackScript, target, target, minMoney);
            const hackCooldown = ns.getHackTime(target);
            serverStates[target].nextAction = Date.now() + hackCooldown;
            break;
          default:
            ns.printf("[%s]-ERROR: Unable to determine action for %s.", selfName, target);
            break;
        }
      }
    }
    await ns.sleep(sleepTime);
  }
}
export {
  main
};
