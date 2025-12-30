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

// servers/home/rooter.js
async function main(ns) {
  if (ns.args.length == 1) {
    const target = ns.args[0];
    if (ns.serverExists(target) == true) {
      ns.tprintf("SUCCESS: Found server: %s", target);
      rootServer(target);
    } else {
      ns.tprintf("ERROR: Unable to find server.");
      ns.exit();
    }
    ns.tprintf("\n");
  } else if (ns.args.length > 1) {
    ns.tprintf("ERROR: More than 1 argument provided. Please provide only a server hostname to target a single server.");
  } else {
    let validatedServers = getValidServerList(ns, scanForServers(ns), 1, 1);
    let count = 1;
    for (let target of validatedServers) {
      ns.tprintf("SUCCESS: Found server #%d: %s", count, target);
      rootServer(target);
      ns.tprintf("\n");
      count++;
    }
    ns.tprintf("INFO: Servers found: %d", validatedServers.length);
  }
  function rootServer(target) {
    let rootResult = false;
    if (ns.hasRootAccess(target) == false) {
      ns.tprintf("INFO: %s has not been rooted.", target);
      rootResult = getRootAccess(ns, target);
      if (rootResult == true) {
        ns.tprintf("SUCCESS: Root access has been granted to: %s", target);
      } else {
        ns.tprintf("ERROR: Failed to grant root access to: %s", target);
      }
    } else {
      ns.tprintf("WARN: Root access was previously granted.");
      rootResult = true;
    }
    return rootResult;
  }
}
export {
  main
};
