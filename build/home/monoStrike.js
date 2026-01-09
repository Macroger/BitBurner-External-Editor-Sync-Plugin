// servers/home/myFunctions.js
function getRootAccess(ns2, target) {
  const portsRequired = ns2.getServerNumPortsRequired(target);
  let nukeRequired = false;
  const numCrackingProgramsAvailable = getNumCrackingPrograms(ns2);
  if (portsRequired <= numCrackingProgramsAvailable) {
    switch (portsRequired) {
      case 5:
        ns2.sqlinject(target);
      case 4:
        ns2.httpworm(target);
      case 3:
        ns2.relaysmtp(target);
      case 2:
        ns2.ftpcrack(target);
      case 1:
        ns2.brutessh(target);
      case 0:
        nukeRequired = true;
    }
  }
  if (nukeRequired == true) {
    ns2.nuke(target);
    ns2.printf("INFO: Nuke performed. Root access should now be granted.");
  }
  return ns2.hasRootAccess(target);
}
function getNumThreadsPossible(ns2, scriptName, target, reserveThreads = 0) {
  const functionName = "getNumThreadsPossible";
  const serverAvailableRam = ns2.getServerMaxRam(target) - ns2.getServerUsedRam(target);
  const scriptRamCost = ns2.getScriptRam(scriptName);
  let numThreads = 0;
  const maxThreadCount = 1e6;
  if (serverAvailableRam >= scriptRamCost) {
    numThreads = Math.floor(serverAvailableRam / scriptRamCost);
    if (numThreads < 1) {
      ns2.printf("[%s]-ERROR: Unable to open any threads. Skipping this target for now - but %s requires investigation.", functionName, target);
      numThreads = 0;
    } else if (numThreads > maxThreadCount) {
      ns2.printf("[%s]-ERROR: Too many threads suggested.(t = %d).", functionName, numThreads);
      numThreads = 0;
    }
  }
  if (reserveThreads > 0) {
    ns2.printf("[%s]-WARN: Detected reserve thread count of %d. Reducing thread count by this amount.", functionName, reserveThreads);
    numThreads = numThreads - reserveThreads;
  }
  return numThreads;
}
function launchScriptAttack(ns2, scriptName, target, source, goal, reserveThreads = 0, localMode = false) {
  const sectionName = "launchScriptAttack";
  let functionResult = false;
  let numThreadsAvailable = 0;
  const desiredNumThreads = getNumThreadsToReachGoal(ns2, scriptName, goal, target);
  if (localMode == true) {
    numThreadsAvailable = getNumThreadsPossible(ns2, scriptName, source, reserveThreads);
  } else {
    numThreadsAvailable = getNumThreadsPossible(ns2, scriptName, target, reserveThreads);
  }
  if (desiredNumThreads === 0) {
    ns2.printf("[%s]-INFO: No threads needed for %s on %s (goal already met or calculation returned zero). Skipping launch.", sectionName, scriptName, target);
    return false;
  }
  if (desiredNumThreads > 0 && desiredNumThreads < numThreadsAvailable) {
    const result = ns2.exec(scriptName, source, desiredNumThreads, target);
    if (result == 0) {
      ns2.printf("[%s]-ERROR: Starting of script %s failed.\nAttempted to open %d threads.", sectionName, scriptName, desiredNumThreads);
    } else {
      ns2.printf("[%s]-SUCCESS: Successfully opened up %d threads of %s on %s\n", sectionName, desiredNumThreads, scriptName, source);
      functionResult = true;
    }
  } else if (numThreadsAvailable > 0) {
    const result = ns2.exec(scriptName, source, numThreadsAvailable, target);
    if (result == 0) {
      ns2.printf("[%s]-ERROR: Starting of script %s failed.\nAttempted to open %d threads.", sectionName, scriptName, numThreadsAvailable);
    } else {
      ns2.printf("[%s]-SUCCESS: Successfully opened up %d threads of %s on %s\n", sectionName, numThreadsAvailable, scriptName, source);
      functionResult = true;
    }
  } else {
    ns2.printf("[%s]-WARN: Not enough RAM available to open any threads on %s.", sectionName, target);
  }
  return functionResult;
}
function getNumThreadsToReachGoal(ns2, scriptName, goal, target, source = "remote") {
  const sectionName = "getNumThreadsToReachGoal";
  let server = source == "remote" ? ns2.getServer(target) : ns2.getServer(source);
  const serverCpuCount = server.cpuCores;
  const localPrefix = "local_";
  const weakenScriptName = localPrefix + "weaken.js";
  const hackScriptName = localPrefix + "hack.js";
  const growScriptName = localPrefix + "grow.js";
  let threadsRequired = 0;
  const THREAD_CAP = 1e4;
  if (scriptName == weakenScriptName) {
    const valueOfOneWeaken = ns2.weakenAnalyze(1, serverCpuCount);
    const serverDecreaseRequired = ns2.getServerSecurityLevel(target) - ns2.getServerMinSecurityLevel(target);
    threadsRequired = serverDecreaseRequired / valueOfOneWeaken;
  } else if (scriptName == hackScriptName) {
    threadsRequired = ns2.hackAnalyzeThreads(target, goal);
  } else if (scriptName == growScriptName) {
    let safeGoal = Math.max(goal, 1);
    threadsRequired = ns2.growthAnalyze(target, safeGoal, serverCpuCount);
    if (threadsRequired > THREAD_CAP) {
      ns2.printf("[%s]-WARN: Calculated grow threads (%d) exceeds cap (%d) for %s. Capping to %d.", sectionName, threadsRequired, THREAD_CAP, target, THREAD_CAP);
      threadsRequired = THREAD_CAP;
    }
  }
  let result = Math.ceil(threadsRequired);
  if (result > THREAD_CAP) {
    ns2.printf("[%s]-WARN: Calculated threads (%d) exceeds cap (%d) for %s. Capping to %d.", sectionName, result, THREAD_CAP, target, THREAD_CAP);
    result = THREAD_CAP;
  }
  return result;
}
function getNumCrackingPrograms(ns2) {
  let numCrackingProgramsAvailable = 0;
  if (ns2.fileExists("bruteSSH.exe", "home")) {
    numCrackingProgramsAvailable++;
  }
  if (ns2.fileExists("relaySMTP.exe", "home")) {
    numCrackingProgramsAvailable++;
  }
  if (ns2.fileExists("FTPCrack.exe", "home")) {
    numCrackingProgramsAvailable++;
  }
  if (ns2.fileExists("SQLInject.exe", "home")) {
    numCrackingProgramsAvailable++;
  }
  if (ns2.fileExists("HTTPWorm.exe", "home")) {
    numCrackingProgramsAvailable++;
  }
  return numCrackingProgramsAvailable;
}
function decideServerAction(ns2, target) {
  let minSec = ns2.getServerMinSecurityLevel(target);
  let curSec = ns2.getServerSecurityLevel(target);
  let maxMoney = ns2.getServerMaxMoney(target);
  let curMoney = ns2.getServerMoneyAvailable(target);
  const weakenThreshold = Math.max(minSec * 1.05, minSec + 2);
  const growThreshold = maxMoney * 0.95;
  const hackThreshold = maxMoney * 0.75;
  if (curSec > weakenThreshold) {
    const cpuCores = ns2.getServer(target).cpuCores || 1;
    const weakenEffect = ns2.weakenAnalyze(1, cpuCores);
    if (curSec - minSec >= weakenEffect) {
      return "weaken";
    }
  }
  if (curSec <= minSec && curMoney >= maxMoney) {
    if (ns2.hackAnalyzeThreads(target, maxMoney) <= 0) {
      return "idle";
    }
  }
  if (curMoney < hackThreshold) {
    return "grow";
  } else if (curMoney >= growThreshold) {
    if (ns2.hackAnalyzeThreads(target, curMoney) > 0) {
      return "hack";
    } else {
      return "idle";
    }
  }
  if (curMoney >= hackThreshold && curMoney < growThreshold) {
    if (ns2.hackAnalyzeThreads(target, curMoney) > 0) {
      return "hack";
    } else {
      return "idle";
    }
  }
  return "grow";
}

// servers/home/monoStrike.js
function logWithTimestamp(message) {
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
async function main(ns2) {
  ns2.disableLog("ALL");
  if (ns2.args.length < 1 || ns2.args.length > 2) {
    logWithTimestamp(`[${selfName}] ERROR: Usage: run monoStrike.js [target] [reserveThreads=0]`);
    ns2.exit();
  }
  if (isNaN(reserveThreads) || reserveThreads < 0) {
    logWithTimestamp(`[${selfName}] ERROR: reserveThreads must be a non-negative integer.`);
    ns2.exit();
  }
  const selfName = "monoStrike";
  const target = ns2.args[0];
  const reserveThreads = ns2.args.length > 1 ? Number(ns2.args[1]) : 0;
  const thisServer = ns2.getServer().hostname;
  const weakenScript = "local_weaken.js";
  const growScript = "local_grow.js";
  const hackScript = "local_hack.js";
  if (!ns2.hasRootAccess(target)) {
    logWithTimestamp(`[${selfName}] INFO: Attempting to gain root access to ${target}...`);
    if (!getRootAccess(ns2, target)) {
      logWithTimestamp(`[${selfName}] ERROR: Could not gain root access to ${target}. Exiting.`);
      ns2.exit();
    } else {
      logWithTimestamp(`[${selfName}] SUCCESS: Root access obtained for ${target}.`);
    }
  }
  logWithTimestamp(`[${selfName}] SUCCESS: Starting attack loop on ${target} from ${thisServer}`);
  while (true) {
    const action = decideServerAction(ns2, target);
    const minSec = ns2.getServerMinSecurityLevel(target);
    const curSec = ns2.getServerSecurityLevel(target);
    const maxMoney = ns2.getServerMaxMoney(target);
    const curMoney = ns2.getServerMoneyAvailable(target);
    let hackPreMoney = null;
    let growPreMoney = null;
    let script, goal;
    if (action === "weaken") {
      script = weakenScript;
      goal = minSec > 0 ? minSec : 1;
      const secPercent = (curSec / goal * 100).toFixed(1);
      logWithTimestamp(`[${selfName}] INFO: Decided to WEAKEN ${target}; Server Security: ${curSec.toFixed(1)} / ${goal.toFixed(1)} = ${secPercent}%`);
    } else if (action === "grow") {
      script = growScript;
      goal = maxMoney / Math.max(curMoney, 1);
      growPreMoney = curMoney;
      logWithTimestamp(`[${selfName}] INFO: Decided to GROW ${target}; Server Money: $${ns2.formatNumber(curMoney)} / $${ns2.formatNumber(maxMoney)}`);
    } else if (action === "hack") {
      script = hackScript;
      goal = curMoney;
      hackPreMoney = curMoney;
      logWithTimestamp(`[${selfName}] INFO: Decided to HACK ${target}; Server Money: $${ns2.formatNumber(curMoney)} / $${ns2.formatNumber(maxMoney)}`);
    } else {
      logWithTimestamp(`[${selfName}] WARN: No valid action for ${target}. Sleeping.`);
      await ns2.sleep(2e3);
      continue;
    }
    const attackSuccess = launchScriptAttack(
      ns2,
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
    if (!attackSuccess) {
      logWithTimestamp(`[${selfName}] WARN: Not enough RAM to run ${script} on ${target}. Sleeping.`);
    }
    let sleepTime = 0;
    if (script === weakenScript) sleepTime = ns2.getWeakenTime(target);
    else if (script === growScript) sleepTime = ns2.getGrowTime(target);
    else if (script === hackScript) sleepTime = ns2.getHackTime(target);
    const sleepBuffer = 250;
    let sleepMs = sleepTime + sleepBuffer;
    const runningScripts = ns2.ps(thisServer).filter((s) => s.filename === script && s.args[0] === target);
    if (runningScripts.length > 0) {
      sleepMs = Math.max(sleepBuffer, Math.floor(sleepMs / 4));
      logWithTimestamp(`[${selfName}] INFO: Detected ${script} already running on ${target}, reducing sleep to ${formatSleepTime(sleepMs)}.`);
    } else {
      logWithTimestamp(`[${selfName}] INFO: Sleeping for ${formatSleepTime(sleepMs)} after running ${script} on ${target}.`);
    }
    await ns2.sleep(sleepMs);
    if (!attackSuccess) continue;
    if (action === "hack" && hackPreMoney !== null) {
      const hackPostMoney = ns2.getServerMoneyAvailable(target);
      const hackGain = hackPreMoney - hackPostMoney;
      logWithTimestamp(`[${selfName}] SUCCESS: Hack on ${target} yielded $${ns2.formatNumber(hackGain)} (before: $${ns2.formatNumber(hackPreMoney)}, after: $${ns2.formatNumber(hackPostMoney)})`);
    } else if (action === "grow" && growPreMoney !== null) {
      const growPostMoney = ns2.getServerMoneyAvailable(target);
      const growGain = growPostMoney - growPreMoney;
      logWithTimestamp(`[${selfName}] SUCCESS: Grow on ${target} yielded $${ns2.formatNumber(growGain)} (before: $${ns2.formatNumber(growPreMoney)}, after: $${ns2.formatNumber(growPostMoney)})`);
    }
  }
}
export {
  main
};
