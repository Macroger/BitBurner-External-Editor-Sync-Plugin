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
function getNumThreadsToReachGoal(ns, scriptName, goal, target, source = "", maxThreads = 25e3) {
  const sectionName = "getNumThreadsToReachGoal";
  if (source == "") {
    source = ns.getHostname();
  }
  if (ns.serverExists(source) == false) {
    ns.tprintf("[%s]-ERROR: Unable to find host.", sectionName);
    ns.exit();
  }
  if (ns.serverExists(target) == false) {
    ns.tprintf("[%s]-ERROR: Unable to find server.", sectionName);
    ns.exit();
  }
  const sourceServer = ns.getServer(source);
  const serverCpuCount = sourceServer.cpuCores;
  const localPrefix = "local_";
  const weakenScriptName = localPrefix + "weaken.js";
  const hackScriptName = localPrefix + "hack.js";
  const growScriptName = localPrefix + "grow.js";
  let threadsRequired = 0;
  const THREAD_CAP = maxThreads;
  if (scriptName == weakenScriptName) {
    const valueOfOneWeaken = ns.weakenAnalyze(1, serverCpuCount);
    const serverDecreaseRequired = ns.getServerSecurityLevel(target) - goal;
    threadsRequired = serverDecreaseRequired / valueOfOneWeaken;
  } else if (scriptName == hackScriptName) {
    threadsRequired = ns.hackAnalyzeThreads(target, goal);
  } else if (scriptName == growScriptName) {
    threadsRequired = ns.growthAnalyze(target, goal, serverCpuCount);
  } else {
    ns.printf("[%s]-ERROR: Unknown script name %s provided for thread calculation on %s.", sectionName, scriptName, target);
    threadsRequired = 0;
  }
  let result = Math.ceil(threadsRequired);
  if (result > THREAD_CAP) {
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
function decideServerAction(ns, target, source = target) {
  let minSec = ns.getServerMinSecurityLevel(target);
  let curSec = ns.getServerSecurityLevel(target);
  let maxMoney = ns.getServerMaxMoney(target);
  let curMoney = ns.getServerMoneyAvailable(target);
  const weakenThresholdPercent = 1.15;
  const weakenThreshold = Math.max(minSec * weakenThresholdPercent, minSec + 2);
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
function logWithTimestamp(ns, message, terminalMode = false) {
  const now = /* @__PURE__ */ new Date();
  const timeStr = now.toTimeString().slice(0, 8);
  if (terminalMode) {
    ns.tprint(`[${timeStr}] ${message}`);
  } else {
    ns.print(`[${timeStr}] ${message}`);
  }
}

// servers/home/uberServerAttacker.js
async function main(ns) {
  function reportStatus(extra = {}) {
    const runningScript = ns.getRunningScript();
    const status = {
      thisServer,
      pid: ns.pid,
      target,
      state,
      action,
      threads: ns.args.threads || 1,
      timestamp: Date.now(),
      runTime: runningScript ? runningScript.onlineRunningTime : null,
      // uptime in seconds
      ...extra
    };
    statusPort.write(JSON.stringify(status));
  }
  const attackerStates = {
    INITIALIZING: "initializing",
    GAINING_ROOT: "gaining_root",
    ATTACKING: "attacking",
    IDLE: "idle",
    ERROR: "error"
  };
  ns.disableLog("ALL");
  const target = ns.args[0];
  const maxAllowedThreads = ns.args.length > 1 ? Number(ns.args[1]) : 1e4;
  const reserveThreads = ns.args.length > 2 ? Number(ns.args[2]) : 0;
  const statusPortNum = ns.args.length > 3 ? Number(ns.args[3]) : 2;
  const selfName = "uberServerAttacker";
  const statusPort = ns.getPortHandle(statusPortNum);
  const thisServer = ns.getServer().hostname;
  const fallbackSleepFraction = 0.25;
  const weakenScript = "local_weaken.js";
  const growScript = "local_grow.js";
  const hackScript = "local_hack.js";
  let state = attackerStates.INITIALIZING;
  let action = "none";
  logWithTimestamp(ns, `[${selfName}] INFO: Starting uberServerAttacker on ${thisServer} targeting ${target} with ${reserveThreads} reserved threads.`);
  if (!ns.hasRootAccess(target)) {
    state = attackerStates.GAINING_ROOT;
    logWithTimestamp(ns, `[${selfName}] WARNING: Access NOT granted. Attempting to gain root access to ${target}...`);
    if (!getRootAccess(ns, target)) {
      state = attackerStates.ERROR;
      logWithTimestamp(ns, `[${selfName}] ERROR: Could not gain root access to ${target}. Exiting.`);
      reportStatus({ error: "Could not gain root access" });
      ns.exit();
    } else {
      let message = `[${selfName}] SUCCESS: Gained root access to ${target}.`;
      logWithTimestamp(ns, message);
    }
  }
  logWithTimestamp(ns, `[${selfName}] SUCCESS: Starting attack loop on ${target} from ${thisServer}`);
  state = attackerStates.ATTACKING;
  while (true) {
    const action2 = decideServerAction(ns, target, thisServer);
    let script, goal, sleepTime;
    const currentMoneyString = `${ns.formatNumber(ns.getServerMoneyAvailable(target), 2, 1e3, true)} / ${ns.formatNumber(ns.getServerMaxMoney(target), 2, 1e3, true)}`;
    if (action2 === "weaken") {
      script = weakenScript;
      goal = ns.getServerMinSecurityLevel(target);
      const currentSecurityString = `${ns.getServerSecurityLevel(target).toFixed(2)} / ${ns.getServerMinSecurityLevel(target).toFixed(2)}`;
      const minSecurityString = ns.getServerMinSecurityLevel(target).toFixed(2);
      logWithTimestamp(ns, `[${selfName}] INFO: Decided to WEAKEN ${target} to reach min security level ${goal}.
                Current security: ${currentSecurityString}, Min Security: ${minSecurityString}. (Desired percent change: ${((ns.getServerSecurityLevel(target) - goal) / ns.getServerSecurityLevel(target) * 100).toFixed(2)}%)`);
    } else if (action2 === "grow") {
      script = growScript;
      goal = ns.getServerMaxMoney(target) / Math.max(ns.getServerMoneyAvailable(target), 1);
      const percentChange = (goal - 1) * 100;
      const percentChangeStr = ns.formatNumber(percentChange, 2, 1e3, false);
      logWithTimestamp(ns, `[${selfName}] INFO: Decided to GROW ${target} to reach max money.
                Current money: ${currentMoneyString} (percent change: ${percentChangeStr}%)`);
    } else if (action2 === "hack") {
      script = hackScript;
      const hackStopThreshold = ns.getServerMaxMoney(target) * 0.75;
      goal = ns.getServerMoneyAvailable(target) - hackStopThreshold;
      goal = Math.max(goal, 1);
      logWithTimestamp(ns, `[${selfName}] INFO: Decided to HACK ${target} down to 75% of max money.
                Current money: ${ns.formatNumber(ns.getServerMoneyAvailable(target), 2, 1e3, true)} / ${ns.formatNumber(ns.getServerMaxMoney(target), 2, 1e3, true)} (target reduction: ${ns.formatNumber(goal, 2, 1e3, true)})`);
    } else {
      state = "idle";
      logWithTimestamp(ns, `[${selfName}] INFO: No action needed against ${target}. Idling.`);
      await ns.sleep(1e3);
      continue;
    }
    const runningScripts = ns.ps(thisServer).filter((s) => s.filename === script && s.args[0] === target);
    if (runningScripts.length > 0) {
      if (action2 === "weaken") sleepTime = ns.getWeakenTime(target) * fallbackSleepFraction;
      else if (action2 === "grow") sleepTime = ns.getGrowTime(target) * fallbackSleepFraction;
      else if (action2 === "hack") sleepTime = ns.getHackTime(target) * fallbackSleepFraction;
      logWithTimestamp(ns, `[${selfName}] INFO: ${script} is already running against ${target}. Sleeping for ${sleepTime} ms.`);
      await ns.sleep(sleepTime);
      continue;
    }
    const attackResult = launchScriptAttack(
      ns,
      // ns instance
      script,
      // script to run
      target,
      // target server
      thisServer,
      // host server
      goal,
      // goal (depends on action)
      maxAllowedThreads,
      // max allowed threads for this attack
      reserveThreads,
      // threads to reserve on host
      true
      // use local mode for launching the attacks
    );
    if (script === weakenScript) sleepTime = ns.getWeakenTime(target) + 150;
    else if (script === growScript) sleepTime = ns.getGrowTime(target) + 150;
    else if (script === hackScript) sleepTime = ns.getHackTime(target) + 150;
    if (attackResult.success == false) {
      const fallbackSleepMs = Math.max(250, Math.floor(sleepTime * fallbackSleepFraction));
      if (attackResult.reason === "Not enough RAM available") {
        logWithTimestamp(ns, `[${selfName}] WARNING: Not enough RAM to launch ${script} against ${target}. Sleeping for ${fallbackSleepMs} ms.`);
        reportStatus({ error: "Not enough RAM to launch attack", sleepTime: fallbackSleepMs });
      } else {
        logWithTimestamp(ns, `[${selfName}] ERROR: Failed to launch ${script} against ${target}. Reason: ${attackResult.reason}. Sleeping for ${fallbackSleepMs} ms.`);
        reportStatus({ error: "Attack failed", reason: attackResult.reason });
      }
      await ns.sleep(fallbackSleepMs);
      continue;
    }
    reportStatus({ lastAttack: { action: action2, script, result: attackResult } });
    await ns.sleep(sleepTime);
  }
}
export {
  main
};
