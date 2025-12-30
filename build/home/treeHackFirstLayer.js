// servers/home/treeHackFirstLayer.js
async function main(ns) {
  function getRootAccess(target) {
    const portsRequired = ns.getServerNumPortsRequired(target);
    let nukeRequired = false;
    if (portsRequired == 2) {
      ns.printf("%s requires 2 ports. Attempting FTPcrack.exe and brutessh.exe", target);
      ns.ftpcrack(target);
      ns.brutessh(target);
      nukeRequired = true;
    } else if (portsRequired == 1) {
      ns.printf("%s requires 1 port. Attempting to execute brutessh.exe", target);
      ns.brutessh(target);
      nukeRequired = true;
    } else if (portsRequired >= 3) {
      ns.printf("%s requires too many ports opened, unable to crack server: %s", target);
    }
    if (nukeRequired == true) {
      ns.nuke(target);
      ns.printf("Nuke performed. Root access should now be granted.");
    }
    return ns.hasRootAccess(target);
  }
  function ensureScriptExists(script, target) {
    const fileExists = ns.fileExists(script, target);
    let fileTransferResult2 = true;
    if (fileExists == false) {
      ns.printf("Detected that the %s file does not exist on %s. Attempting to copy it over now.", script, target);
      fileTransferResult2 = ns.scp(script, target);
      if (fileTransferResult2 == true) {
        ns.printf("Succesfully copied %s to %s", script, target);
      } else {
        ns.printf("Failed to copy %s to %s.", script, target);
      }
    }
    return fileTransferResult2;
  }
  function getNumThreadsPossible(scriptName, target) {
    const serverAvailableRam = ns.getServerMaxRam(target) - ns.getServerUsedRam(target);
    const scriptRamCost = ns.getScriptRam(scriptName, target);
    const numThreads = serverAvailableRam / scriptRamCost;
    return Math.floor(numThreads);
  }
  const weakenScript = "local_weaken.js";
  const growScript = "local_grow.js";
  const hackScript = "local_hack.js";
  let servers = ns.scan();
  for (let target of servers) {
    ns.printf("Found server: %s", target);
    if (!ns.hasRootAccess(target)) {
      const rootAccess = getRootAccess(target);
      if (rootAccess == true) {
        ns.printf("Root access has been confirmed. %s is now cracked.", target);
      } else {
        ns.printf("%s remains uncracked. Check error logs, root access remains denied. Continuing to next target.", target);
        continue;
      }
    } else {
      ns.printf("Root access has been granted.");
    }
    ns.printf("Entering security section of treeHack for server: %s.", target);
    const serverCurrentSecurityLevel = ns.getServerSecurityLevel(target);
    const serverMinimumSecurityLevel = ns.getServerMinSecurityLevel(target);
    const serverBaseSecurityLevel = ns.getServerBaseSecurityLevel(target);
    const serverSecurityLowerAdjuster = (serverBaseSecurityLevel - serverMinimumSecurityLevel) / 4;
    const serverSecurityUpperAdjuster = (serverBaseSecurityLevel - serverMinimumSecurityLevel) / 2;
    const serverSecurityLowerThreshold = serverMinimumSecurityLevel + serverSecurityLowerAdjuster;
    const serverSecurityUpperThreshold = serverMinimumSecurityLevel + serverSecurityUpperAdjuster;
    if (serverCurrentSecurityLevel > serverSecurityUpperThreshold) {
      const scriptFileExists = ns.fileExists(weakenScript, target);
      if (scriptFileExists == false) {
        fileTransferResult = ns.scp(weakenScript, target);
        if (fileTransferResult == true) {
          ns.printf("Succesfully copied %s to %s", weakenScript, target);
        } else {
          ns.printf("Failed to copy %s to %s.", weakenScript, target);
        }
      }
      ns.printf("Testing if the %s is running on %s.", weakenScript, target);
      const scriptIsRunning2 = ns.scriptRunning(weakenScript, target);
      if (scriptIsRunning2 == false) {
        ns.printf("Detected that the %s is NOT running on %s\nAttempting to launch %s.", weakenScript, target, weakenScript);
        const numThreads = getNumThreadsPossible(weakenScript, target);
        if (numThreads < 1) {
          ns.printf("Unable to open any threads. Skipping this target for now - but %s requires investigation.", target);
          continue;
        }
        const result = ns.exec(weakenScript, target, numThreads, target);
        if (result == 0) {
          ns.printf("Staring of script %s failed.\nAttempted to open %d threads.", weakenScript, numThreads);
        } else {
          ns.printf("Successfully opened up %d threads of %s on %s", numThreads, weakenScript, target);
        }
      }
      continue;
    } else if (serverCurrentSecurityLevel < serverSecurityLowerThreshold) {
      ns.printf("Server security level below lower threshold, entering section to kill weaken script.");
      if (ns.scriptRunning(weakenScript, target) == true) {
        ns.printf("Found weaken script running, sending kill all command.");
        ns.killall(target);
      } else {
        ns.printf("Weaken script NOT detected. Moving to next section of code.");
      }
    } else {
      ns.printf("This server has entered the security goldylocks zone.");
    }
    ns.printf("Entering money section of treeHack for server: %s.", target);
    const serverCurrentMoney = ns.getServerMoneyAvailable(target);
    const serverMaxMoney = ns.getServerMaxMoney(target);
    const serverMoneyUpperThreshold = serverMaxMoney * 0.85;
    const serverMoneyLowerThreshold = serverMaxMoney * 0.6;
    if (serverCurrentMoney < serverMoneyLowerThreshold) {
      const numThreads = getNumThreadsPossible(growScript, target);
      if (numThreads < 1) {
        ns.printf("Unable to open any grow threads. Skipping this target for now - but %s requires investigation.", target);
        continue;
      }
      const result = ns.exec(growScript, target, numThreads, target);
      if (result == 0) {
        ns.printf("Staring of script %s failed.\nAttempted to open %d threads.", growScript, numThreads);
      } else {
        ns.printf("Successfully opened up %d threads of %s on %s", numThreads, growScript, target);
      }
    } else if (serverCurrentMoney > serverMoneyUpperThreshold) {
      const scriptIsActive = ns.scriptRunning(growScript, target);
      if (scriptIsActive == true) {
        ns.printf("Detected script active but money above upper threshold on server: %s. Killing script %s.", target, growScript);
        ns.killall(target);
      }
    } else {
    }
    ns.printf("Entering hack section of treeHack for server: %s.", target);
    const scriptExists = ensureScriptExists(hackScript, target);
    if (scriptExists == false) {
      ns.printf("Unable to transfer script file. Skipping this target for now - but %s requires investigation.", target);
      continue;
    }
    const scriptIsRunning = ns.scriptRunning(hackScript, target);
    if (scriptIsRunning == false) {
      ns.printf("Detected that the %s is NOT running on %s\nAttempting to launch %s.", hackScript, target, hackScript);
      const numThreads = getNumThreadsPossible(hackScript, target);
      if (numThreads < 1) {
        ns.printf("Unable to open any threads. Skipping this target for now - but %s requires investigation.", target);
        continue;
      }
      const result = ns.exec(hackScript, target, numThreads, target);
      if (result == 0) {
        ns.printf("Staring of script %s failed.\nAttempted to open %d threads.", hackScript, numThreads);
      } else {
        ns.printf("Successfully opened up %d threads of %s on %s", numThreads, hackScript, target);
      }
    } else {
      continue;
    }
  }
}
export {
  main
};
