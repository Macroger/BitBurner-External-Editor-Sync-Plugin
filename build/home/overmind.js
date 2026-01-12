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

// servers/home/overmind.js
async function main(ns) {
  const weakenScript = "weaken.js";
  const growScript = "grow.js";
  const hackScript = "hack.js";
  const sleepTime = 3e3;
  while (true) {
    const validatedServersList = getValidServerList(ns, scanForAllServers(ns), 1, 1, true, false);
    for (let target of validatedServersList) {
      let sectionName = "ScanSection";
      if (ns.hasRootAccess(target) == false) {
        const rootAccess = getRootAccess(ns, target);
        if (rootAccess == false) {
          ns.printf("[%s]-ERROR: %s remains uncracked. Check error logs, root access remains denied. Continuing to next server.", sectionName, target);
          continue;
        }
      }
      ns.printf("[%s]-SUCCESS: Found server: %s", sectionName, target);
      const serverCurrentSecurityLevel = ns.getServerSecurityLevel(target);
      const serverBaseSecurity = ns.getServerBaseSecurityLevel(target);
      const serverMinSecurity = ns.getServerMinSecurityLevel(target);
      const serverSecurityRange = serverBaseSecurity - serverMinSecurity;
      const serverSecurityLowerThreshold = serverSecurityRange * 0.2 + serverMinSecurity;
      const serverSecurityUpperThreshold = serverSecurityRange * 0.8 + serverMinSecurity;
      const serverMaxMoney = ns.getServerMaxMoney(target);
      const serverMoneyUpperThreshold = serverMaxMoney * 0.95;
      const serverMoneyLowerThreshold = serverMaxMoney * 0.75;
      let securitySectionReportsGood = false;
      let moneySectionReportsGood = false;
      sectionName = "SecuritySection";
      if (serverCurrentSecurityLevel > serverSecurityUpperThreshold) {
        ns.printf("[%s]-INFO: %s security rating is above upper threshold.", sectionName, target);
        if (ns.isRunning(weakenScript, target, target) == false) {
          if (ns.isRunning(hackScript, target, target) == true) {
            ns.kill(hackScript, target, target);
          }
          if (ns.isRunning(growScript, target, target) == true) {
            ns.kill(growScript, target, target);
          }
          ns.printf("[%s]-INFO: Determined %s is not running.", sectionName, weakenScript);
          if (ensureScriptExists(ns, weakenScript, target) == true) {
            const result = launchScriptAttack(ns, weakenScript, target, target, serverMinSecurity, 0, false);
            if (result == true) {
              ns.printf("SCUCCESS: Launched %s attack on %s.", weakenScript, target);
            } else {
              ns.printf("ERROR: Failed to launch %s attack on %s.", weakenScript, target);
            }
          } else {
            ns.printf("[%s]-ERROR: Unable to verify %s exists on %s. This server needs to be investigated for issues.", sectionName, weakenScript, target);
          }
        } else {
          ns.printf("[%s]-WARN: %s is already running on %s. Skipping to next target.", sectionName, weakenScript, target);
        }
      } else if (serverCurrentSecurityLevel < serverSecurityLowerThreshold) {
        ns.printf("[%s]-INFO: Server security level below lower threshold, determining if weaken script is running.", sectionName);
        if (ns.isRunning(weakenScript, target, target) == true) {
          ns.printf("[%s]-WARN: Found weaken script running, sending kill command.", sectionName);
          ns.kill(weakenScript, target, target);
          securitySectionReportsGood = true;
        } else {
          ns.printf("[%s]-INFO: Weaken script NOT detected. Moving to next section of code.", sectionName);
          securitySectionReportsGood = true;
        }
      } else {
        ns.printf("[%s]-INFO: %s is in the security goldylocks zone.", sectionName, target);
        securitySectionReportsGood = true;
      }
      if (securitySectionReportsGood == true) {
        sectionName = "MoneySection";
        const serverCurrentMoney = ns.getServerMoneyAvailable(target);
        if (serverCurrentMoney < serverMoneyLowerThreshold) {
          ns.printf("[%s]-WARN: %s current money is less than lower threshold. Initating grow sequence.", sectionName, target);
          if (ns.isRunning(growScript, target, target) == true) {
            ns.printf("[%s]-WARN: %s script already runnng on %s. Continuing to next target server.", sectionName, growScript, target);
          } else {
            if (ns.isRunning(hackScript, target, target) == true) {
              ns.kill(hackScript, target, target);
            }
            if (ns.isRunning(weakenScript, target, target) == true) {
              ns.kill(weakenScript, target, target);
            }
            if (ensureScriptExists(ns, growScript, target) == true) {
              const growthRateMultipler = calculateGrowthRateMultiplier(ns, target);
              const result = launchScriptAttack(ns, growScript, target, target, growthRateMultipler, 0, false);
              if (result == true) {
                ns.printf("[%s]-SCUCCESS: Launched %s attack on %s.", sectionName, growScript, target);
              } else {
                ns.printf("[%s]-ERROR: Failed to launch %s attack on %s.", sectionName, growScript, target);
              }
            } else {
              ns.printf("[%s]-ERROR: Unable to verify %s exists. This server needs to be investigated for issues.", sectionName, target);
            }
          }
        } else if (serverCurrentMoney > serverMoneyUpperThreshold) {
          if (ns.isRunning(growScript, target, target) == true) {
            ns.printf("INFO: Detected script active but money above upper threshold on server: %s. Killing script %s.", target, growScript);
            ns.kill(growScript, target, target);
            moneySectionReportsGood = true;
          } else {
            ns.printf("INFO: Detected %s script not active and money above upper threshold on server: %s. Money section reports good.", growScript, target);
            moneySectionReportsGood = true;
          }
        } else {
          moneySectionReportsGood = true;
        }
      }
      if (moneySectionReportsGood == true) {
        sectionName = "HackSection";
        ns.printf("[%s]-INFO: Entering hack section for server: %s.", sectionName, target);
        if (ensureScriptExists(ns, hackScript, target) == false) {
          ns.printf("[%s]-WARN: Unable to transfer %s file. Skipping this target for now - but %s requires investigation.", sectionName, hackScript, target);
        } else {
          if (ns.isRunning(hackScript, target, target) == true) {
            ns.printf("[%s]-INFO: Hack in progress on server %s. Continuing to next target.", sectionName, target);
          } else {
            if (ns.isRunning(growScript, target, target) == true) {
              ns.kill(growScript, target, target);
            }
            if (ns.isRunning(weakenScript, target, target) == true) {
              ns.kill(weakenScript, target, target);
            }
            const result = launchScriptAttack(ns, hackScript, target, target, serverMoneyLowerThreshold, 0, false);
            if (result == true) {
              ns.printf("[%s]-SCUCCESS: Launched %s attack on %s.", sectionName, hackScript, target);
            } else {
              ns.printf("[%s]-ERROR: Failed to launch %s attack on %s.", sectionName, hackScript, target);
            }
          }
        }
      }
    }
    await ns.sleep(sleepTime);
  }
}
export {
  main
};
