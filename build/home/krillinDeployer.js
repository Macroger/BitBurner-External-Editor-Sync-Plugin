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

// servers/home/krillinDeployer.js
async function main(ns) {
  let sectionName = "ScanSection";
  const weakenScript = "weaken.js";
  const growScript = "grow.js";
  const hackScript = "hack.js";
  let target = "";
  const homeComputer = ns.getServer().hostname;
  if (ns.args.length != 0) {
    target = ns.args[0];
  } else {
    ns.printf("ERROR: Incorrect argument provided. Please provide only a server hostname.");
    ns.exit();
  }
  const sleepTime = ns.getHackTime(target) / 2;
  const serverBaseSecurity = ns.getServerBaseSecurityLevel(target);
  const serverMinSecurity = ns.getServerMinSecurityLevel(target);
  const serverSecurityRange = serverBaseSecurity - serverMinSecurity;
  const serverSecurityLowerThreshold = serverSecurityRange * 0.2 + serverMinSecurity;
  const serverSecurityUpperThreshold = serverSecurityRange * 0.8 + serverMinSecurity;
  const serverMaxMoney = ns.getServerMaxMoney(target);
  const serverMoneyUpperThreshold = serverMaxMoney * 0.95;
  const serverMoneyLowerThreshold = serverMaxMoney * 0.5;
  const reserveThreads = 8;
  const neighborFound = ns.serverExists(target);
  if (neighborFound == false) {
    ns.printf("ERROR: Unable to find target server %s. Exiting.", target);
    ns.exit();
  }
  while (true) {
    let weakenSectionReportsGood = false;
    let growSectionReportsGood = false;
    if (ns.hasRootAccess(target) == false) {
      const rootAccess = getRootAccess(ns, target);
      if (rootAccess == false) {
        ns.printf("[%s]-ERROR: %s remains uncracked. Check error logs, root access remains denied. Exiting.", sectionName, target);
        ns.exit();
      }
    }
    sectionName = "SecuritySection";
    const serverCurrentSecurityLevel = ns.getServerSecurityLevel(target);
    if (serverCurrentSecurityLevel > serverSecurityUpperThreshold) {
      if (ns.isRunning(weakenScript, homeComputer, target) == false) {
        ns.kill(hackScript, homeComputer, target);
        ns.kill(growScript, homeComputer, target);
        const result = launchScriptAttack(ns, weakenScript, target, homeComputer, serverMinSecurity, reserveThreads, true);
        if (result == true) {
          ns.printf("SCUCCESS: Launched %s attack on %s.", weakenScript, target);
        } else {
          ns.printf("ERROR: Failed to launch %s attack on %s.", weakenScript, target);
        }
      } else {
        ns.printf("[%s]-INFO: %s is already running on %s. Going to sleep for %d %s.", sectionName, weakenScript, homeComputer, Math.floor(sleepTime / 1e3), sleepTime > 1e3 ? "seconds" : "second");
      }
    } else if (serverCurrentSecurityLevel < serverSecurityLowerThreshold) {
      ns.printf("[%s]-INFO: %s security level below lower threshold, determining if weaken script is running.", sectionName, target);
      if (ns.isRunning(weakenScript, homeComputer, target) == true) {
        ns.printf("[%s]-WARN: Found weaken script running, sending kill command.", sectionName);
        ns.kill(weakenScript, homeComputer, target);
        if (ns.isRunning(weakenScript, homeComputer, target) == false) {
          ns.printf("[%s]-INFO: Weaken script no longer detected. Moving to next section of code.", sectionName);
          weakenSectionReportsGood = true;
        } else {
          ns.printf("[%s]-ERROR: Unable to kill weaken script, check logs for errors.");
        }
      } else {
        ns.printf("[%s]-INFO: Weaken script NOT detected. Moving to next section of code.", sectionName);
        weakenSectionReportsGood = true;
      }
    } else {
      ns.printf("INFO: Security level acceptable. Moving to money stage.");
      weakenSectionReportsGood = true;
    }
    if (weakenSectionReportsGood == true) {
      const serverCurrentMoney = ns.getServerMoneyAvailable(target);
      if (serverCurrentMoney < serverMoneyLowerThreshold) {
        if (ns.isRunning(growScript, homeComputer, target) == true) {
          ns.printf("[%s]-WARN: %s is already running on %s. Going to sleep for %d seconds.", sectionName, growScript, homeComputer, Math.floor(sleepTime / 1e3));
        } else {
          ns.kill(weakenScript, homeComputer, target);
          ns.kill(hackScript, homeComputer, target);
          const newGrowthRateMultipler = calculateGrowthRateMultiplier(ns, target);
          const result = launchScriptAttack(ns, growScript, target, homeComputer, newGrowthRateMultipler, reserveThreads, true);
          if (result == true) {
            ns.printf("SCUCCESS: Launched %s attack on %s.", growScript, target);
          } else {
            ns.printf("ERROR: Failed to launch %s attack on %s.", growScript, target);
          }
        }
      } else if (serverCurrentMoney > serverMoneyUpperThreshold) {
        const scriptIsActive = ns.isRunning(growScript, homeComputer, target);
        if (scriptIsActive == true) {
          ns.printf("INFO: Detected script active but money above upper threshold on server: %s. Killing script %s.", homeComputer, growScript);
          ns.kill(growScript, homeComputer, target);
          if (ns.isRunning(growScript, homeComputer, target) == false) {
            ns.printf("[%s]-INFO: %s script no longer detected. Moving to next section of code.", sectionName, growScript);
            growSectionReportsGood = true;
          } else {
            ns.printf("[%s]-ERROR: Unable to kill weaken script, check logs for errors.");
          }
        } else {
          ns.printf("[%s]-INFO: %s script NOT detected. Moving to next section of code.", sectionName, growScript);
          growSectionReportsGood = true;
        }
      } else {
        ns.printf("INFO: Entering money section #4.");
        growSectionReportsGood = true;
      }
    }
    if (growSectionReportsGood == true) {
      ns.printf("INFO: Entering hack section #1.");
      const scriptIsRunning = ns.isRunning(hackScript, homeComputer, target);
      if (scriptIsRunning == false) {
        ns.printf("INFO: Entering hack section #2.");
        ns.printf("ERROR: Detected that the %s is NOT running on %s. Attempting to launch %s.", hackScript, homeComputer, hackScript);
        ns.kill(weakenScript, homeComputer, target);
        ns.kill(growScript, homeComputer, target);
        const result = launchScriptAttack(ns, hackScript, target, homeComputer, serverMoneyLowerThreshold, reserveThreads, true);
        if (result == true) {
          ns.printf("SCUCCESS: Launched %s attack on %s.", hackScript, target);
        } else {
          ns.printf("ERROR: Failed to launch %s attack on %s.", hackScript, target);
        }
      } else {
        ns.printf("INFO: Entering hack section #3.");
        ns.printf("WARN: %s is running. Sleeping for %d seconds.", hackScript, sleepTime / 1e3);
      }
    }
    await ns.sleep(sleepTime);
  }
}
export {
  main
};
