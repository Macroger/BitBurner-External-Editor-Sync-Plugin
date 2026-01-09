// servers/home/attackCoordinator.js
async function main(ns) {
  if (ns.args.length < 1) {
    ns.tprintf("Usage: run attackCoordinator.js [target1] [target2] ...");
    ns.exit();
  }
  const targets = ns.args;
  const scripts = ["homeAttack.js", "local_hack.js", "local_grow.js", "local_weaken.js"];
  const purchasedServers = ns.getPurchasedServers();
  if (targets.length > purchasedServers.length) {
    ns.tprintf("Warning: More targets (%d) than purchased servers (%d). Some targets will NOT be assigned any server!", targets.length, purchasedServers.length);
  } else if (purchasedServers.length < targets.length) {
    ns.tprintf("Warning: Not enough purchased servers (%d) to attack all targets (%d). Some targets will not be attacked.", purchasedServers.length, targets.length);
  }
  for (let i = 0; i < purchasedServers.length; ++i) {
    const server = purchasedServers[i];
    const target = targets[i % targets.length];
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
    const freeRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
    const scriptRam = ns.getScriptRam("homeAttack.js", server);
    if (freeRam >= scriptRam) {
      const pid = ns.exec("homeAttack.js", server, 1, target);
      if (pid !== 0) {
        ns.tprintf("Launched homeAttack.js on %s with 1 thread targeting %s", server, target);
      } else {
        ns.tprintf("ERROR: Failed to launch homeAttack.js on %s", server);
      }
    } else {
      ns.tprintf("ERROR: Not enough free RAM to run homeAttack.js on %s (Required: %s, Available: %s)", server, ns.formatRam(scriptRam), ns.formatRam(freeRam));
    }
  }
}
export {
  main
};
