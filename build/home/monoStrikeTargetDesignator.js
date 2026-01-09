// servers/home/myFunctions.js
function ensureScriptExists(ns, script, target) {
  const fileExists = ns.fileExists(script, target);
  let fileTransferResult = true;
  if (fileExists == false) {
    ns.printf("INFO: Detected that the %s file does not exist on %s. Attempting to copy it over now.", script, target);
    fileTransferResult = ns.scp(script, target);
    if (fileTransferResult == true) {
      ns.printf("SUCCESS: Succesfully copied %s to %s", script, target);
    } else {
      ns.printf("ERROR: Failed to copy %s to %s.", script, target);
    }
  }
  return fileTransferResult;
}

// servers/home/monoStrikeTargetDesignator.js
async function main(ns) {
  if (ns.args.length < 1) {
    ns.tprintf("Usage: run monoStrikeTargetDesignator.js [target1] [target2] ...");
    ns.exit();
  }
  const targets = ns.args;
  const selfName = "monoStrikeTargetDesignator";
  const attackScript = "monoStrike.js";
  const hackScript = "local_hack.js";
  const growScript = "local_grow.js";
  const weakenScript = "local_weaken.js";
  const scripts = [attackScript, hackScript, growScript, weakenScript];
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
      if (await ensureScriptExists(ns, script, server)) {
        ns.tprintf("Copied or verified %s on %s", script, server);
        copiedAny = true;
      } else {
        ns.tprintf("ERROR: Failed to copy %s to %s", script, server);
      }
    }
    ns.tprintf("[Status] Scripts ready on %s. Relaunching monoStrike.js with new target.", server);
    ns.scriptKill("monoStrike.js", server);
    const freeRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
    const scriptRam = ns.getScriptRam("monoStrike.js", server);
    if (freeRam >= scriptRam) {
      const pid = ns.exec("monoStrike.js", server, 1, target);
      if (pid !== 0) {
        ns.tprintf("Launched monoStrike.js on %s with 1 thread targeting %s", server, target);
      } else {
        ns.tprintf("ERROR: Failed to launch monoStrike.js on %s", server);
      }
    } else {
      ns.tprintf("ERROR: Not enough free RAM to run monoStrike.js on %s (Required: %s, Available: %s)", server, ns.formatRam(scriptRam), ns.formatRam(freeRam));
    }
  }
}
export {
  main
};
