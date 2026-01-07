// servers/home/myFunctions.js
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

// servers/home/new_sniffer.js
function printServerSummary(ns, server, idx, total) {
  const cyan = "\x1B[36m";
  const green = "\x1B[32m";
  const red = "\x1B[31m";
  const magenta = "\x1B[35m";
  const reset = "\x1B[0m";
  const name = `${magenta}${server.name}${reset}`;
  const security = `${cyan}${ns.formatNumber(ns.getServerSecurityLevel(server.name), 2, 1e3, true)}${reset}`;
  const securityLabel = `${green}Security: ${reset}`;
  const ram = `${cyan}${ns.formatRam(ns.getServerMaxRam(server.name))}${reset}`;
  const ramLabel = `${green}RAM: ${reset}`;
  const money = `${cyan}${ns.formatNumber(ns.getServerMaxMoney(server.name), 2, 1e3, true)}${reset}`;
  const moneyLabel = `${green}Max Money: ${reset}`;
  const rootLabel = `${green}Root Access: ${reset}`;
  const root = ns.hasRootAccess(server.name) ? `${green}GRANTED${reset}` : `${red}DENIED${reset}`;
  let summary = `[${idx}/${total}] `;
  summary += name;
  summary += " | " + securityLabel + security;
  summary += " | " + ramLabel + ram;
  summary += " | " + moneyLabel + money;
  summary += " | " + rootLabel + root;
  ns.tprintf(summary);
  ns.tprintf("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
}
function printServerInfo(ns, target, index = null, total = null) {
  const cyan = "\x1B[36m";
  const green = "\x1B[32m";
  const red = "\x1B[31m";
  const reset = "\x1B[0m";
  const pastelPink = "\x1B[38;5;218m";
  const peach = "\x1B[38;5;215m";
  const runningScripts = ns.ps(target);
  const label = (txt) => `${pastelPink}${txt.padEnd(30)}${reset}`;
  const value = (txt, color = reset) => `${color}${txt}${reset}`;
  const growMins = Math.floor(ns.getGrowTime(target) / 1e3 / 60);
  const growSecs = Math.floor(ns.getGrowTime(target) / 1e3 % 60);
  const weakMins = Math.floor(ns.getWeakenTime(target) / 1e3 / 60);
  const weakSecs = Math.floor(ns.getWeakenTime(target) / 1e3 % 60);
  const hackMins = Math.floor(ns.getHackTime(target) / 1e3 / 60);
  const hackSecs = Math.floor(ns.getHackTime(target) / 1e3 % 60);
  if (index !== null && total !== null) {
    ns.tprintf(`
Showing server ${index} of ${total}: ${cyan}${target}${reset}`);
  } else {
    ns.tprintf(`${cyan}${target}${reset}`);
  }
  ns.tprintf("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  ns.tprintf("%s%s", label("Hacking skill:"), value(ns.formatNumber(ns.getServerRequiredHackingLevel(target), 2, 1e3, true), green));
  ns.tprintf("%s%s / %s", label("Security (Curr. / Min):"), value(ns.formatNumber(ns.getServerSecurityLevel(target), 0), cyan), value(ns.formatNumber(ns.getServerMinSecurityLevel(target), 0), green));
  ns.tprintf("%s%s", label("Growth rate:"), value(ns.getServerGrowth(target), cyan));
  ns.tprintf("%s%s minutes %s seconds", label("Grow time:"), value(growMins, cyan), value(growSecs, cyan));
  ns.tprintf("%s%s minutes %s seconds", label("Weaken time:"), value(weakMins, cyan), value(weakSecs, cyan));
  ns.tprintf("%s%s minutes %s seconds", label("Hack time:"), value(hackMins, cyan), value(hackSecs, cyan));
  ns.tprintf("%s%s / %s", label("Money (Avail/Max):"), value(`$${ns.formatNumber(ns.getServerMoneyAvailable(target), 1, 1e3, true)}`, cyan), value(`$${ns.formatNumber(ns.getServerMaxMoney(target), 2, 1e3, true)}`, green));
  ns.tprintf("%s%s / %s", label("RAM (Used/Total):"), value(ns.formatRam(ns.getServerUsedRam(target)), ns.getServerUsedRam(target) === ns.getServerMaxRam(target) ? red : cyan), value(ns.formatRam(ns.getServerMaxRam(target)), green));
  const lock = ns.hasRootAccess(target) ? "\u{1F513}" : "\u{1F512}";
  ns.tprintf("%s%s %s%s", label("Root access status:"), lock, ns.hasRootAccess(target) ? value("Granted", green) : value("Not Granted", red), reset);
  if (runningScripts.length === 0) {
    ns.tprintf("%s%s", label("Running scripts:"), value("None detected.", green));
  } else {
    ns.tprintf("%s", label("Scripts running:"));
    for (let script of runningScripts) {
      ns.tprintf("  %s%s%s %s%s%s", green, script.filename, reset, cyan, script.args && script.args.length > 0 ? `[${script.args.join(", ")}]` : "", reset);
    }
  }
  ns.tprintf("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
}
async function main(ns) {
  let summaryMode = false;
  let detailedMode = false;
  let filterMode = false;
  let helpMode = false;
  let optimalMode = false;
  const maxServersToShow = 10;
  const defaultServersToShow = 3;
  let serverCountToShow = 0;
  let filterModeType = "";
  const args = ns.args;
  if (args.length === 0) {
    summaryMode = true;
  } else if (args.length >= 1) {
    if (String(args[0]).startsWith("-")) {
      if (args[0] === "-h") {
        helpMode = true;
      } else if (args[0] === "-m" || args[0] === "-r" || args[0] === "-g" || args[0] === "-s" || args[0] === "-o" || args[0] === "-O") {
        filterMode = true;
        if (args.length >= 2) {
          serverCountToShow = parseInt(args[1]);
          if (isNaN(serverCountToShow) || serverCountToShow < 1 || serverCountToShow > maxServersToShow) {
            ns.tprintf("ERROR: Invalid number of servers to show: '%s'. Must be between 1 and %d.", args[1], maxServersToShow);
            return;
          }
        } else {
          serverCountToShow = defaultServersToShow;
        }
        filterModeType = args[0].substring(1);
      } else {
        ns.tprintf("ERROR: Unknown flag '%s'", args[0]);
        return;
      }
    } else {
      detailedMode = true;
    }
  }
  let servers = scanForAllServers(ns);
  if (summaryMode) {
    ns.tprintf("\nScanning all servers...\n");
    let idx = 1;
    if (servers.length === 0) {
      ns.tprintf("ERROR: No servers found!");
      return;
    }
    ns.tprintf("SUCCESS: Found %d servers. Showing summary:", servers.length);
    ns.tprintf("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
    for (let server of servers) {
      printServerSummary(ns, server, idx, servers.length);
      idx++;
    }
    ns.tprintf("\nTo see a particular server's details run this script with that server's hostname as argument.");
    ns.tprintf("Example: run new_sniffer.js n00dles");
    return;
  } else if (detailedMode) {
    let arg = args[0];
    let target = null;
    if (!isNaN(arg)) {
      let idx = parseInt(arg);
      if (idx >= 1 && idx <= servers.length) {
        target = servers[idx - 1].name;
      } else {
        ns.tprintf("ERROR: Index %s is out of range (1-%d)", arg, servers.length);
        return;
      }
    } else {
      ns.tprintf("Looking for server named '%s'...", arg);
      let found = servers.find((s) => s.name === arg);
      if (found) {
        target = found.name;
      } else {
        ns.tprintf("ERROR: Server '%s' not found!", arg);
        return;
      }
    }
    printServerInfo(ns, target);
    return;
  } else if (filterMode) {
    if (filterModeType === "m") {
      ns.tprintf("\nFiltering servers by max money...\n\n");
      servers.sort((a, b) => ns.getServerMaxMoney(b.name) - ns.getServerMaxMoney(a.name));
    } else if (filterModeType === "r") {
      ns.tprintf("\nFiltering servers by max RAM...\n\n");
      servers.sort((a, b) => ns.getServerMaxRam(b.name) - ns.getServerMaxRam(a.name));
    } else if (filterModeType === "g") {
      ns.tprintf("\nFiltering servers by growth rate...\n\n");
      servers.sort((a, b) => ns.getServerGrowth(b.name) - ns.getServerGrowth(a.name));
    } else if (filterModeType === "s") {
      ns.tprintf("\nFiltering servers by lowest security level...\n\n");
      servers.sort((a, b) => ns.getServerSecurityLevel(a.name) - ns.getServerSecurityLevel(b.name));
    } else if (filterModeType === "") {
      ns.tprintf("ERROR: No valid filter type specified.");
      return;
    } else if (filterModeType === "o") {
      ns.tprintf("\nFiltering servers by optimal hacking targets...\n\n");
      servers = servers.filter((s) => ns.getServerMaxRam(s.name) === 0 && ns.getServerMaxMoney(s.name) > 0);
      servers.sort((a, b) => {
        const aScore = ns.getServerMaxMoney(a.name) * ns.getServerGrowth(a.name) / (ns.getGrowTime(a.name) + ns.getHackTime(a.name) + ns.getWeakenTime(a.name) + 1);
        const bScore = ns.getServerMaxMoney(b.name) * ns.getServerGrowth(b.name) / (ns.getGrowTime(b.name) + ns.getHackTime(b.name) + ns.getWeakenTime(b.name) + 1);
        return bScore - aScore;
      });
    } else if (filterModeType === "O") {
      ns.tprintf("\nFiltering servers by optimal hacking targets for the home computer, I.E., servers with no RAM...\n\n");
      servers = servers.filter((s) => ns.getServerMaxMoney(s.name) > 0 && ns.getServerMaxRam(s.name) > 0);
      servers.sort((a, b) => {
        const aScore = ns.getServerMaxMoney(a.name) * ns.getServerGrowth(a.name) / (ns.getGrowTime(a.name) + ns.getHackTime(a.name) + ns.getWeakenTime(a.name) + 1);
        const bScore = ns.getServerMaxMoney(b.name) * ns.getServerGrowth(b.name) / (ns.getGrowTime(b.name) + ns.getHackTime(b.name) + ns.getWeakenTime(b.name) + 1);
        return bScore - aScore;
      });
    }
    if (serverCountToShow > 0) {
      servers = servers.slice(0, serverCountToShow);
    }
    servers.forEach((server) => printServerInfo(ns, server.name));
  } else if (helpMode) {
    ns.tprintf("\n=== new_sniffer.js Help ===\n");
    ns.tprintf("This script scans and displays information about BitBurner servers in a formatted, color-coded way.\n");
    ns.tprintf("\nFeatures:");
    ns.tprintf("- Lists all discovered servers with key stats (money, RAM, security, growth, etc.)");
    ns.tprintf("- Shows detailed info for a specific server by hostname");
    ns.tprintf("- Supports filtering and sorting the server list by various criteria");
    ns.tprintf("- Filter options include max money, RAM, growth, security, and optimal hacking targets");
    ns.tprintf("- 'Optimal' filters help you find the best servers to hack for profit, including a special mode for remote hacking from home\n");
    ns.tprintf("Usage:");
    ns.tprintf("  run new_sniffer.js                # Show summary of all servers");
    ns.tprintf("  run new_sniffer.js <hostname>     # Show details for a specific server");
    ns.tprintf("  run new_sniffer.js -m [N]         # Show top N servers sorted by max money");
    ns.tprintf("  run new_sniffer.js -r [N]         # Show top N servers sorted by max RAM");
    ns.tprintf("  run new_sniffer.js -g [N]         # Show top N servers sorted by growth");
    ns.tprintf("  run new_sniffer.js -s [N]         # Show top N servers sorted by lowest security");
    ns.tprintf("  run new_sniffer.js -o [N]         # Show top N optimal hack targets (high money, low times)");
    ns.tprintf("  run new_sniffer.js -O [N]         # Show top N optimal hack targets for home (no RAM servers)");
    ns.tprintf("  run new_sniffer.js -h             # Show this help screen\n");
    ns.tprintf("Arguments:");
    ns.tprintf("  -m   Sort by max money\n  -r   Sort by max RAM\n  -g   Sort by growth\n  -s   Sort by lowest security\n  -o   Optimal hack targets (profit/time)\n  -O   Optimal hack targets for home (no RAM)\n  -h   Show help\n");
    ns.tprintf("If N is omitted, the top 3 servers are shown. N must be between 1 and 10.\n");
    ns.tprintf("Examples:");
    ns.tprintf("  run new_sniffer.js -m 3\n  run new_sniffer.js -o 5\n  run new_sniffer.js -O 7\n  run new_sniffer.js n00dles\n");
    ns.tprintf("===========================\n");
    return;
  }
}
export {
  main
};
