// servers/home/serverActionManager.js
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
async function main(ns) {
  const target = ns.args[0];
  let mode = "analyze";
  let minSec = ns.getServerMinSecurityLevel(target);
  let curSec = ns.getServerSecurityLevel(target);
  let maxMoney = ns.getServerMaxMoney(target);
  let curMoney = ns.getServerMoneyAvailable(target);
  const minMoney = 0;
  const weakenThreshold = minSec * 1.05;
  const growThreshold = maxMoney * 0.75;
  const hackThreshold = maxMoney * 0.92;
  while (true) {
    minSec = ns.getServerMinSecurityLevel(target);
    curSec = ns.getServerSecurityLevel(target);
    maxMoney = ns.getServerMaxMoney(target);
    curMoney = ns.getServerMoneyAvailable(target);
    switch (mode) {
      case "analyze":
        if (curSec > weakenThreshold) {
          mode = "weaken";
        } else if (curMoney < growThreshold) {
          mode = "grow";
        } else if (curMoney >= hackThreshold) {
          mode = "hack";
        }
        continue;
      case "weaken":
        launchScriptAttack(ns, "weaken.js", target, target, minSec, 0, false);
        mode = "analyze";
        await ns.sleep(ns.getWeakenTime(target));
        continue;
      case "grow":
        launchScriptAttack(ns, "grow.js", target, target, maxMoney, 0, false);
        mode = "analyze";
        await ns.sleep(ns.getGrowTime(target));
        continue;
      case "hack":
        launchScriptAttack(ns, "hack.js", target, target, minMoney, 0, false);
        mode = "analyze";
        await ns.sleep(ns.getHackTime(target));
        continue;
        break;
    }
  }
}
export {
  main
};
