// servers/home/new_sniffer.js
async function main(ns) {
  if (ns.args.length === 0) {
    if (ns.args[0] == "all") {
      let servers = ns.scan();
      for (let target of servers) {
        const runningScripts = ns.ps(target);
        ns.tprintf("\n%s found!", target);
        ns.tprintf("\nServer security ratings (Minimum, Base, Current): (%s, %s, %s)", ns.formatNumber(ns.getServerMinSecurityLevel(target)), ns.formatNumber(ns.getServerBaseSecurityLevel(target)), ns.formatNumber(ns.getServerSecurityLevel(target)));
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
            ns.tprintf(script.args);
          }
        }
        ns.tprintf("------------------------------------------------------------------------------------------------");
      }
    }
  } else {
  }
  function drawFrame() {
    ns.tprintf("HOSTNAME");
  }
}
export {
  main
};
