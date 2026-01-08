// servers/home/attackCoordinator.js
async function main(ns) {
  if (ns.args.length !== 1) {
    ns.tprintf("Usage: run attackCoordinator.js [target]");
    ns.exit();
  }
  const target = ns.args[0];
  const scripts = ["homeAttack.js", "local_hack.js", "local_grow.js", "local_weaken.js"];
  const purchasedServers = ns.getPurchasedServers();
  for (const server of purchasedServers) {
    let copiedAny = false;
    for (const script of scripts) {
      if (!ns.fileExists(script, server)) {
        await ns.scp(script, server);
        ns.tprintf("Copied %s to %s", script, server);
        copiedAny = true;
      }
    }
    if (copiedAny) {
      ns.tprintf("[Init] Scripts deployed to %s for the first time.", server);
    } else {
      ns.tprintf("[Update] Scripts already present on %s. Relaunching with new target.", server);
    }
    ns.scriptKill("homeAttack.js", server);
    const maxRam = ns.getServerMaxRam(server);
    const scriptRam = ns.getScriptRam("homeAttack.js", server);
    const threads = Math.floor(maxRam / scriptRam);
    if (threads > 0) {
      const pid = ns.exec("homeAttack.js", server, threads, target);
      if (pid !== 0) {
        ns.tprintf("Launched homeAttack.js on %s with %d threads targeting %s", server, threads, target);
      } else {
        ns.tprintf("ERROR: Failed to launch homeAttack.js on %s", server);
      }
    } else {
      ns.tprintf("ERROR: Not enough RAM to run homeAttack.js on %s", server);
    }
  }
}
export {
  main
};
