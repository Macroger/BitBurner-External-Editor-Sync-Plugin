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
  if (desiredNumThreads === 0) {
    ns.printf("[%s]-INFO: No threads needed for %s on %s (goal already met or calculation returned zero). Skipping launch.", sectionName, scriptName, target);
    return false;
  }
  if (desiredNumThreads > 0 && desiredNumThreads < numThreadsAvailable) {
    const result = ns.exec(scriptName, source, desiredNumThreads, target);
    if (result == 0) {
      ns.printf("[%s]-ERROR: Starting of script %s failed.\nAttempted to open %d threads.", sectionName, scriptName, desiredNumThreads);
    } else {
      ns.printf("[%s]-SUCCESS: Successfully opened up %d threads of %s on %s\n", sectionName, desiredNumThreads, scriptName, source);
      functionResult = true;
    }
  } else if (numThreadsAvailable > 0) {
    const result = ns.exec(scriptName, source, numThreadsAvailable, target);
    if (result == 0) {
      ns.printf("[%s]-ERROR: Starting of script %s failed.\nAttempted to open %d threads.", sectionName, scriptName, numThreadsAvailable);
    } else {
      ns.printf("[%s]-SUCCESS: Successfully opened up %d threads of %s on %s\n", sectionName, numThreadsAvailable, scriptName, source);
      functionResult = true;
    }
  } else {
    ns.printf("[%s]-WARN: Not enough RAM available to open any threads on %s.", sectionName, target);
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
function decideServerAction(ns, target) {
  let minSec = ns.getServerMinSecurityLevel(target);
  let curSec = ns.getServerSecurityLevel(target);
  let maxMoney = ns.getServerMaxMoney(target);
  let curMoney = ns.getServerMoneyAvailable(target);
  const weakenThreshold = Math.max(minSec * 1.05, minSec + 2);
  const growThreshold = maxMoney * 0.95;
  const hackThreshold = maxMoney * 0.75;
  if (curSec > weakenThreshold) {
    const cpuCores = ns.getServer(target).cpuCores || 1;
    const weakenEffect = ns.weakenAnalyze(1, cpuCores);
    if (curSec - minSec >= weakenEffect) {
      return "weaken";
    }
  }
  if (curSec <= minSec && curMoney >= maxMoney) {
    if (ns.hackAnalyzeThreads(target, maxMoney) <= 0) {
      return "idle";
    }
  }
  if (curMoney < hackThreshold) {
    return "grow";
  } else if (curMoney >= growThreshold) {
    if (ns.hackAnalyzeThreads(target, curMoney) > 0) {
      return "hack";
    } else {
      return "idle";
    }
  }
  if (curMoney >= hackThreshold && curMoney < growThreshold) {
    if (ns.hackAnalyzeThreads(target, curMoney) > 0) {
      return "hack";
    } else {
      return "idle";
    }
  }
  return "grow";
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
  const defaultSleep = 2e3;
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
      hackPreMoney = curMoney;
      logWithTimestamp(ns, `[${selfName}] INFO: Decided to HACK ${target}; Server Money: $${ns.formatNumber(curMoney)} / $${ns.formatNumber(maxMoney)}`);
    } else {
      logWithTimestamp(ns, `[${selfName}] WARN: No valid action for ${target}. Sleeping.`);
      await ns.sleep(defaultSleep);
      continue;
    }
    const runningScripts = ns.ps(thisServer).filter((s) => s.filename === script && s.args[0] === target);
    if (runningScripts.length > 0) {
      logWithTimestamp(ns, `[${selfName}] INFO: Detected ${script} already running on ${target}. Sleeping for ${formatSleepTime(defaultSleep)}.`);
      await ns.sleep(defaultSleep);
      continue;
    }
    const attackSuccess = launchScriptAttack(
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
    if (!attackSuccess) {
      logWithTimestamp(ns, `[${selfName}] WARN: Not enough RAM to run ${script} on ${target}. Sleeping for ${formatSleepTime(defaultSleep)}.`);
      await ns.sleep(defaultSleep);
      continue;
    } else {
    }
    let sleepTime = 0;
    if (script === weakenScript) sleepTime = ns.getWeakenTime(target);
    else if (script === growScript) sleepTime = ns.getGrowTime(target);
    else if (script === hackScript) sleepTime = ns.getHackTime(target);
    const sleepBuffer = 250;
    let sleepMs = sleepTime + sleepBuffer;
    ns.tprintf(`[${selfName}] INFO: Sleeping for ${formatSleepTime(sleepMs)} after running ${script} on ${target}.`);
    await ns.sleep(sleepMs);
    if (action === "hack" && hackPreMoney !== null) {
      const hackPostMoney = ns.getServerMoneyAvailable(target);
      const hackGain = hackPreMoney - hackPostMoney;
      logWithTimestamp(ns, `[${selfName}] SUCCESS: Hack on ${target} yielded $${ns.formatNumber(hackGain)} (before: $${ns.formatNumber(hackPreMoney)}, after: $${ns.formatNumber(hackPostMoney)})`);
    } else if (action === "grow" && growPreMoney !== null) {
      const growPostMoney = ns.getServerMoneyAvailable(target);
      const growGain = growPostMoney - growPreMoney;
      logWithTimestamp(ns, `[${selfName}] SUCCESS: Grow on ${target} yielded $${ns.formatNumber(growGain)} (before: $${ns.formatNumber(growPreMoney)}, after: $${ns.formatNumber(growPostMoney)})`);
    }
  }
}
export {
  main
};
