// servers/home/myFunctions.js
function displayStats(ns, target) {
  const runningScripts = ns.ps(target);
  ns.tprintf("\n%s found!", target);
  ns.tprintf("Required hacking skill: %s", ns.formatNumber(ns.getServerRequiredHackingLevel(target), 2, 1e3, true));
  ns.tprintf(
    "\nServer security ratings:\n(Min., Base, Current)\n(%s, %s, %s)",
    ns.formatNumber(ns.getServerMinSecurityLevel(target)),
    ns.formatNumber(ns.getServerBaseSecurityLevel(target)),
    ns.formatNumber(ns.getServerSecurityLevel(target))
  );
  ns.tprintf("\nGrowth rate: %d", ns.getServerGrowth(target));
  ns.tprintf("\nGrow time: %d minutes %d seconds.", ns.getGrowTime(target) / 1e3 / 60, ns.getGrowTime(target) / 1e3 % 60);
  ns.tprintf("Weaken time: %d minutes %d seconds.", ns.getWeakenTime(target) / 1e3 / 60, ns.getWeakenTime(target) / 1e3 % 60);
  ns.tprintf("Hack time: %d minutes %d seconds.", ns.getHackTime(target) / 1e3 / 60, ns.getHackTime(target) / 1e3 % 60);
  ns.tprintf("\nMoney available: $%s", ns.formatNumber(ns.getServerMoneyAvailable(target), 2, 1e3, true));
  ns.tprintf("Maximum Money: $%s", ns.formatNumber(ns.getServerMaxMoney(target), 2, 1e3, true));
  ns.tprintf("\nTotal amount of RAM: %s", ns.formatRam(ns.getServerMaxRam(target)));
  ns.tprintf("Amount of free RAM: %s", ns.formatRam(ns.getServerMaxRam(target) - ns.getServerUsedRam(target)));
  ns.tprintf("\nRoot access status: %s", ns.hasRootAccess(target) ? "Granted" : "Not Granted");
  ns.tprintf("Ports required to crack: %d", ns.getServerNumPortsRequired(target));
  if (runningScripts.length == 0) {
    ns.tprintf("Local scripts running: None detected.");
  } else {
    ns.tprintf("Scripts running: ");
    for (let script of runningScripts) {
      ns.tprintf("%s", script.filename);
    }
  }
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

// servers/home/serverCrawler.js
async function main(ns) {
  let startingPoint = "home";
  let useValidate = false;
  let useRamRequirement = false;
  let useAntiRamRequirement = false;
  let validatedServerList = [];
  if (ns.args.length != 0) {
    for (let arg of ns.args) {
      if (arg == "-v") {
        useValidate = true;
      } else if (arg == "-r") {
        useRamRequirement = true;
      } else if (arg == "-R") {
        useAntiRamRequirement = true;
      } else {
        startingPoint = arg;
      }
    }
  }
  if (useValidate == true) {
    const servers = scanForServers(ns, startingPoint);
    ns.tprintf("Detected %d un-validated servers", servers.length);
    validatedServerList = getValidServerList(ns, servers);
    ns.tprintf("SUCCESS: Found %d validated servers, sniffing those servers...", validatedServerList.length);
  } else if (useAntiRamRequirement == true) {
    validatedServerList = getValidServerList(ns, scanForServers(ns, startingPoint), 1, 1, false, true);
  } else if (useRamRequirement == true) {
    validatedServerList = getValidServerList(ns, scanForServers(ns, startingPoint), 1, 1, true, false);
  }
  for (let target of validatedServerList) {
    ns.tprintf("------------------------------------------------------------------------------------------------");
    displayStats(ns, target);
    ns.tprintf("------------------------------------------------------------------------------------------------");
  }
  ns.tprintf("INFO: Number of servers listed: %d", validatedServerList.length);
}
export {
  main
};
