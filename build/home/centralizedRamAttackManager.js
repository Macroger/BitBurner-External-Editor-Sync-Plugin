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
    const aScore = getServerScore(ns, aName);
    const bScore = getServerScore(ns, bName);
    return bScore - aScore;
  });
}
function getServerScore(ns, target) {
  const maxMoney = ns.getServerMaxMoney(target);
  const growth = ns.getServerGrowth(target);
  const minSec = ns.getServerMinSecurityLevel(target);
  const score = maxMoney > 0 && minSec > 0 ? maxMoney * growth / minSec : -Infinity;
  return score;
}

// servers/home/centralizedRamAttackManager.js
async function main(ns) {
  ns.disableLog("ALL");
  function resetAttacker(attacker) {
    attacker.activeScript = "";
    attacker.requiredThreads = 0;
    attacker.requiredRam = 0;
    attacker.pid = 0;
    attacker.wakeupTime = Date.now();
    attacker.status = "pending";
    attacker.priorityScore = 0;
    attacker.currentMode = "init";
    attacker.description = "";
    attacker.targetCurrentMoney = 0;
    attacker.targetMaxMoney = 0;
    attacker.targetCurrentSecurity = 0;
    attacker.targetMinSecurity = 0;
    attacker.preGrowthServerMoney = 0;
  }
  function printStatusReport(ns2) {
    const runningAttackers = attackers.filter((a) => a.status === "running");
    const pendingAttackers = attackers.filter((a) => a.status === "pending");
    const totalThreads = runningAttackers.reduce((sum, a) => sum + a.requiredThreads, 0);
    ns2.printf(
      `${label_color}[${selfName}]: RAM:${reset_color} ${label_color}Used${reset_color} ${value_color}%s${reset_color} ${label_color}/ Max${reset_color} ${value_color}%s${reset_color} ${label_color}| Free:${reset_color} ${value_color}%s${reset_color} ${label_color}| Running:${reset_color} ${value_color}%d${reset_color} ${label_color}| Pending:${reset_color} ${value_color}%d${reset_color} ${label_color}| Total Threads Used:${reset_color} ${value_color}%d${reset_color}`,
      ns2.formatRam(ns2.getServerUsedRam(host)),
      ns2.formatRam(maxRam),
      ns2.formatRam(maxRam - ns2.getServerUsedRam(host)),
      runningAttackers.length,
      pendingAttackers.length,
      totalThreads
    );
    ns2.print(`
`);
    ns2.printf(
      `${header_color}[${selfName}]: %-8s %-20s %-9s %-8s %-8s %-10s %-15s %-23s %-s${reset_color}`,
      "Score",
      "Server Name",
      "Status",
      "Mode",
      "Threads",
      "Security",
      "    Money   ",
      "Wakeup",
      "Description"
    );
    for (const attacker of attackers) {
      let targetName = typeof attacker.target === "string" ? attacker.target : attacker.target && attacker.target.name ? attacker.target.name : "<unknown>";
      let wakeupIn = "-";
      if (attacker.status === "running") {
        const msLeft = Math.max(0, attacker.wakeupTime - Date.now());
        wakeupIn = formatSleepTime(msLeft);
      }
      const runningStatusColor = attacker.status === "running" ? green_color : attacker.status === "pending" ? orange_color : red_color;
      const modeColor = attacker.currentMode === "weaken" ? magenta_color : attacker.currentMode === "grow" ? green_color : attacker.currentMode === "hack" ? orange_color : yellow_color;
      const descriptionColor = modeColor;
      let displayPriority = ns2.formatNumber(attacker.priorityScore, 1, 1e3, true);
      ns2.printf(
        `${label_color}[${selfName}]: ${reset_color}${value_color}%-8s ${reset_color}${value_color}%-20s ${reset_color}${runningStatusColor}%-9s ${reset_color}${modeColor}%-8s ${reset_color}${value_color}%-8d ${reset_color}${value_color}%3s/%-5s ${reset_color} ${value_color}%6s/%-8s${reset_color} ${value_color}%-24s${reset_color} ${descriptionColor}%-s${reset_color}`,
        displayPriority,
        targetName,
        attacker.status,
        attacker.currentMode,
        attacker.requiredThreads,
        attacker.targetCurrentSecurity.toFixed(0),
        attacker.targetMinSecurity.toFixed(0),
        ns2.formatNumber(attacker.targetCurrentMoney, 1, 1e3, true),
        ns2.formatNumber(attacker.targetMaxMoney, 1, 1e3, true),
        wakeupIn,
        attacker.description
      );
    }
  }
  let targetQueue = getValidServerList(ns, scanForAllServers(ns), 1, 1, true, true);
  const host = ns.getHostname();
  let maxRam = ns.getServerMaxRam(host);
  const selfName = "C.R.A.M.";
  const weakenScript = "local_weaken.js";
  const growScript = "local_grow.js";
  const hackScript = "local_hack.js";
  let loopCounter = 0;
  const reportInterval = 1;
  const mainLoopTimeDelay = 1e3;
  const attackScriptDelayBuffer = 150;
  let attackers = [];
  let attackersRequiringAction = [];
  let generateReport = false;
  const blue_color = "\x1B[38;5;39m";
  const yellow_color = "\x1B[38;5;226m";
  const cyan_color = "\x1B[38;5;51m";
  const green_color = "\x1B[38;5;46m";
  const orange_color = "\x1B[38;5;208m";
  const magenta_color = "\x1B[38;5;201m";
  const delta_symbol = "\u0394";
  const label_color = blue_color;
  const value_color = yellow_color;
  const header_color = cyan_color;
  const reset_color = "\x1B[0m";
  const reportSeparator = `${header_color}[${selfName}]: ====================================================================================================================${reset_color}`;
  while (true) {
    if (loopCounter % reportInterval === 0) {
      generateReport = true;
      ns.print(`



`);
      ns.print(`${reportSeparator}`);
      ns.print(`${header_color}[${selfName}]: SUCCESS: Starting main loop iteration ${value_color}${loopCounter}${reset_color} on host ${value_color}${host}${reset_color}`);
      printStatusReport(ns, loopCounter);
    }
    let usedRam = ns.getServerUsedRam(host);
    let freeRam = maxRam - usedRam;
    if (loopCounter % 30 === 0) {
      targetQueue = getValidServerList(ns, scanForAllServers(ns), 1, 1, true, false);
      sortQueueByScore(ns, targetQueue);
      maxRam = ns.getServerMaxRam(host);
      for (const target of targetQueue) {
        const already = attackers.find((a) => a.target === target);
        if (already) {
          continue;
        }
        if (!ns.hasRootAccess(target)) {
          const rooted = getRootAccess(ns, target);
          if (!rooted) {
            ns.print(`[${selfName}]: WARNING: Could not gain root access to ${target}. Skipping attack setup for this target.`);
            continue;
          }
        }
        let newAttacker = {
          activeScript: "",
          target,
          requiredThreads: 0,
          requiredRam: 0,
          pid: 0,
          wakeupTime: Date.now(),
          // timestamp to wake up - for when processing an action
          status: "pending",
          // 'running' | 'pending' | 'finished'
          priorityScore: 0,
          // priority/score based on the botnet scoring method
          currentMode: "init",
          // 'hack' | 'grow' | 'weaken' | 'init'
          description: "",
          targetCurrentMoney: 0,
          targetMaxMoney: 0,
          targetCurrentSecurity: 0,
          targetMinSecurity: 0,
          preGrowthServerMoney: 0
        };
        attackers.push(newAttacker);
      }
      attackers.sort((a, b) => {
        const aScore = a.priorityScore;
        const bScore = b.priorityScore;
        return bScore - aScore;
      });
    }
    attackersRequiringAction = [];
    for (const attacker of attackers) {
      if (attacker.status === "running" && attacker.wakeupTime <= Date.now()) {
        resetAttacker(attacker);
        attackersRequiringAction.push(attacker);
      } else if (attacker.status === "pending") {
        attackersRequiringAction.push(attacker);
      } else {
        continue;
      }
    }
    for (const attacker of attackersRequiringAction) {
      if (attacker.currentMode !== "init") {
        continue;
      }
      const action = decideServerAction(ns, attacker.target, host);
      let requiredThreads = 0;
      let goal = 0;
      attacker.targetCurrentMoney = ns.getServerMoneyAvailable(attacker.target);
      attacker.targetMaxMoney = ns.getServerMaxMoney(attacker.target);
      attacker.targetCurrentSecurity = ns.getServerSecurityLevel(attacker.target);
      attacker.targetMinSecurity = ns.getServerMinSecurityLevel(attacker.target);
      if (action === "weaken") {
        attacker.activeScript = weakenScript;
        attacker.currentMode = "weaken";
        goal = attacker.targetMinSecurity;
        const currentServerSecurity = attacker.targetCurrentSecurity;
        const goalPercentChange = currentServerSecurity / goal * 100;
        attacker.description = "Weaken security by " + ns.formatNumber(currentServerSecurity - goal, 1) + " to " + goal + ". " + delta_symbol + "= " + ns.formatNumber(goalPercentChange, 1, 1e3, true) + "%";
        requiredThreads = getNumThreadsToReachGoal(ns, attacker.activeScript, goal, attacker.target, host);
      } else if (action === "grow") {
        attacker.activeScript = growScript;
        attacker.currentMode = "grow";
        attacker.preGrowthServerMoney = attacker.targetCurrentMoney;
        const goalFactor = 1 / (attacker.targetCurrentMoney / attacker.targetMaxMoney);
        const goalPercentChange = goalFactor * 100;
        const growAmount = attacker.targetMaxMoney - attacker.targetCurrentMoney;
        attacker.description = "Growing money by " + ns.formatNumber(growAmount, 1, 1e3, true) + " to " + ns.formatNumber(attacker.targetMaxMoney, 1, 1e3, true) + ". " + delta_symbol + "= " + ns.formatNumber(goalPercentChange, 1, 1e3, true) + "%";
        requiredThreads = getNumThreadsToReachGoal(ns, attacker.activeScript, goalFactor, attacker.target, host);
      } else if (action === "hack") {
        attacker.activeScript = hackScript;
        attacker.currentMode = "hack";
        const currentMoney = attacker.targetCurrentMoney;
        const maxMoney = attacker.targetMaxMoney;
        const desiredHackPercent = 0.25;
        goal = maxMoney * desiredHackPercent;
        const goalPercentChange = goal / currentMoney * 100;
        attacker.description = "Hacking money by " + ns.formatNumber(goal, 1, 1e3, true) + " to " + ns.formatNumber(attacker.targetCurrentMoney - goal, 1, 1e3, true) + ". " + delta_symbol + "= " + ns.formatNumber(desiredHackPercent * 100, 2, 1e3, false) + "%";
        requiredThreads = getNumThreadsToReachGoal(ns, attacker.activeScript, goal, attacker.target, host);
      } else {
        resetAttacker(attacker);
        continue;
      }
      attacker.requiredThreads = requiredThreads;
      const scriptRam = ns.getScriptRam(attacker.activeScript, host);
      attacker.requiredRam = requiredThreads * scriptRam;
      const idx = targetQueue.findIndex((t) => t === attacker.target);
      if (idx !== -1) {
        attacker.priorityScore = getServerScore(ns, attacker.target);
      }
    }
    attackersRequiringAction.sort((a, b) => {
      const aScore = a.priorityScore;
      const bScore = b.priorityScore;
      return bScore - aScore;
    });
    for (const attacker of attackersRequiringAction) {
      if (attacker.status !== "pending") {
        continue;
      }
      freeRam = maxRam - ns.getServerUsedRam(host);
      if (attacker.requiredRam <= freeRam && attacker.requiredThreads > 0) {
        const pid = ns.exec(
          attacker.activeScript,
          host,
          attacker.requiredThreads,
          attacker.target
        );
        if (pid > 0) {
          attacker.pid = pid;
          attacker.status = "running";
          attacker.wakeupTime = Date.now() + (attacker.currentMode === "weaken" ? ns.getWeakenTime(attacker.target) : attacker.currentMode === "grow" ? ns.getGrowTime(attacker.target) : ns.getHackTime(attacker.target)) + attackScriptDelayBuffer;
        } else {
          attacker.pid = 0;
        }
      } else if (attacker.requiredRam > freeRam && attacker.requiredThreads > 0) {
        const scriptRam = ns.getScriptRam(attacker.activeScript, host);
        if (freeRam / scriptRam >= 1) {
          const maxThreadsPossible = Math.floor(freeRam / scriptRam);
          if (maxThreadsPossible > 0) {
            const pid = ns.exec(
              attacker.activeScript,
              host,
              maxThreadsPossible,
              attacker.target
            );
            if (pid > 0) {
              attacker.pid = pid;
              attacker.requiredThreads = maxThreadsPossible;
              attacker.requiredRam = maxThreadsPossible * scriptRam;
              attacker.status = "running";
              attacker.wakeupTime = Date.now() + (attacker.currentMode === "weaken" ? ns.getWeakenTime(attacker.target) : attacker.currentMode === "grow" ? ns.getGrowTime(attacker.target) : ns.getHackTime(attacker.target)) + attackScriptDelayBuffer;
            } else {
              attacker.pid = 0;
            }
          }
        } else {
          break;
        }
      }
    }
    const running = ns.ps(host);
    if (generateReport) {
      ns.print(`${reportSeparator}`);
      generateReport = false;
    }
    loopCounter++;
    await ns.sleep(mainLoopTimeDelay);
  }
}
export {
  main
};
