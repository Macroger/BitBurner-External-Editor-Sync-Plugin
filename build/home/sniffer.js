// servers/home/sniffer.js
async function main(ns) {
  function displayStats(target) {
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
    ns.tprintf("\nMoney available: $%s", ns.formatNumber(ns.getServerMoneyAvailable(target), 2, 1e3, true));
    ns.tprintf("Maximum Money: $%s", ns.formatNumber(ns.getServerMaxMoney(target), 2, 1e3, true));
    ns.tprintf("\nTotal amount of RAM: %s", ns.formatRam(ns.getServerMaxRam(target)));
    ns.tprintf("Amount of free RAM: %s", ns.formatRam(ns.getServerMaxRam(target) - ns.getServerUsedRam(target)));
    ns.tprintf("\nRoot access status: %s", ns.hasRootAccess(target) ? "Granted" : "Not Granted");
    if (runningScripts.length == 0) {
      ns.tprintf("Running scripts: None detected.");
    } else {
      ns.tprintf("Scripts running: ");
      for (let script of runningScripts) {
        ns.tprintf("%s", script.filename);
      }
    }
  }
  if (ns.args.length === 0) {
    ns.tprintf("No argument provided. This script requires a hostname be provided as first argument.");
    ns.exit();
  } else {
    if (ns.args[0] == "all") {
      let servers = ns.scan();
      ns.tprintf("------------------------------------------------------------------------------------------------");
      for (let target of servers) {
        displayStats(target);
        ns.tprintf("------------------------------------------------------------------------------------------------");
      }
    } else {
      const target = ns.args[0];
      ns.tprintf("Searching for %s...", target);
      let neighborFound = ns.serverExists(target);
      if (neighborFound == true) {
        ns.tprintf("------------------------------------------------------------------------------------------------");
        displayStats(target);
        ns.tprintf("------------------------------------------------------------------------------------------------");
      } else {
        ns.tprintf("Unable to find %s.", ns.args[0]);
      }
    }
  }
}
export {
  main
};
