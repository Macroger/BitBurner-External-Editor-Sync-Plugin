// servers/home/new_sniffer.js
function printServerInfo(ns, target, index = null, total = null) {
  const cyan = "\x1B[36m";
  const green = "\x1B[32m";
  const red = "\x1B[31m";
  const reset = "\x1B[0m";
  const runningScripts = ns.ps(target);
  const label = (txt) => `${cyan}${txt.padEnd(30)}${reset}`;
  const value = (txt, color = reset) => `${color}${txt}${reset}`;
  if (index !== null && total !== null) {
    ns.tprintf(`
Showing server ${index} of ${total}: ${cyan}${target}${reset}`);
  } else {
    ns.tprintf(`
${cyan}${target}${reset}`);
  }
  ns.tprintf("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  ns.tprintf("%s%s", label("Hacking skill:"), value(ns.formatNumber(ns.getServerRequiredHackingLevel(target), 2, 1e3, true), green));
  ns.tprintf(
    "%s%s / %s",
    label("Security (Curr. / Min):"),
    value(ns.formatNumber(ns.getServerSecurityLevel(target), 0), green),
    value(ns.formatNumber(ns.getServerMinSecurityLevel(target), 0), cyan)
  );
  ns.tprintf("%s%s", label("Growth rate:"), value(ns.getServerGrowth(target), green));
  const growMins = Math.floor(ns.getGrowTime(target) / 1e3 / 60);
  const growSecs = Math.floor(ns.getGrowTime(target) / 1e3 % 60);
  ns.tprintf("%s%s minutes %s seconds", label("Grow time:"), value(growMins, cyan), value(growSecs, cyan));
  const weakMins = Math.floor(ns.getWeakenTime(target) / 1e3 / 60);
  const weakSecs = Math.floor(ns.getWeakenTime(target) / 1e3 % 60);
  ns.tprintf("%s%s minutes %s seconds", label("Weaken time:"), value(weakMins, cyan), value(weakSecs, cyan));
  const hackMins = Math.floor(ns.getHackTime(target) / 1e3 / 60);
  const hackSecs = Math.floor(ns.getHackTime(target) / 1e3 % 60);
  ns.tprintf("%s%s minutes %s seconds", label("Hack time:"), value(hackMins, cyan), value(hackSecs, cyan));
  ns.tprintf(
    "%s%s / %s",
    label("Money (Avail/Max):"),
    value(`$${ns.formatNumber(ns.getServerMoneyAvailable(target), 1, 1e3, true)}`, green),
    value(`$${ns.formatNumber(ns.getServerMaxMoney(target), 2, 1e3, true)}`, green)
  );
  ns.tprintf(
    "%s%s / %s",
    label("RAM (Used/Total):"),
    value(ns.formatRam(ns.getServerUsedRam(target)), ns.getServerUsedRam(target) === ns.getServerMaxRam(target) ? red : cyan),
    value(ns.formatRam(ns.getServerMaxRam(target)), green)
  );
  const lock = ns.hasRootAccess(target) ? "\u{1F513}" : "\u{1F512}";
  ns.tprintf(
    "%s%s %s%s",
    label("Root access status:"),
    lock,
    ns.hasRootAccess(target) ? value("Granted", green) : value("Not Granted", red),
    reset
  );
  if (runningScripts.length === 0) {
    ns.tprintf("%s%s", label("Running scripts:"), value("None detected.", green));
  } else {
    ns.tprintf("%s", label("Scripts running:"));
    for (let script of runningScripts) {
      ns.tprintf(
        "  %s%s%s %s%s%s",
        green,
        script.filename,
        reset,
        cyan,
        script.args && script.args.length > 0 ? `[${script.args.join(", ")}]` : "",
        reset
      );
    }
  }
  ns.tprintf("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
}
async function main(ns) {
  const cyan = "\x1B[36m";
  const green = "\x1B[32m";
  const red = "\x1B[31m";
  const reset = "\x1B[0m";
  if (ns.args.length === 0) {
    ns.tprintf("INFO: No target server specified, scanning all directly connected servers...");
    let servers = ns.scan();
    if (servers.length == 0) {
      ns.tprintf("ERROR: No directly connected servers found!");
      return;
    } else {
      ns.tprintf("SUCCESS: Found %d directly connected servers, sniffing those servers...", servers.length);
    }
    let serverNumber = 1;
    for (let target of servers) {
      printServerInfo(ns, target, serverNumber, servers.length);
      serverNumber++;
    }
  } else {
    ns.tprintf("\n");
    ns.tprintf("INFO: Target server specified, sniffing %s...", ns.args[0]);
    let target = ns.args[0];
    if (ns.serverExists(target)) {
      printServerInfo(ns, target);
    } else {
      ns.tprintf("ERROR: Server %s not found!", target);
    }
  }
}
export {
  main
};
