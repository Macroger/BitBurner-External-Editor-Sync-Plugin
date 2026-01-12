// servers/home/monoStrikeManager.js
async function main(ns) {
  const monoStrikeScript = "monoStrike.js";
  const server = ns.getHostname();
  const targets = ns.args.length > 0 ? ns.args : ["n00dles", "foodnstuff"];
  const monoStrikeRam = ns.getScriptRam(monoStrikeScript, server);
  if (!monoStrikeRam) {
    ns.tprintf("ERROR: Could not determine RAM usage for %s. Ensure the script exists.", monoStrikeScript);
    return;
  }
  let running = [];
  function launchAll() {
    running = [];
    let freeRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
    for (const target of targets) {
      const maxThreads = Math.floor(freeRam / monoStrikeRam);
      if (maxThreads < 1) {
        ns.tprintf("WARNING: Not enough RAM to launch monoStrike for %s.", target);
        continue;
      }
      const pid = ns.exec(monoStrikeScript, server, maxThreads, target);
      if (pid !== 0) {
        running.push({ target, pid, threads: maxThreads });
        freeRam -= monoStrikeRam * maxThreads;
      } else {
        ns.tprintf("ERROR: Failed to launch monoStrike for %s.", target);
      }
    }
  }
  launchAll();
  while (true) {
    ns.clearLog();
    ns.print(`monoStrikeManager status for ${server}`);
    ns.print(`Total RAM: ${ns.formatRam(ns.getServerMaxRam(server))}, Used: ${ns.formatRam(ns.getServerUsedRam(server))}`);
    for (const inst of running) {
      if (ns.isRunning(inst.pid, server)) {
        ns.print(`Target: ${inst.target} | PID: ${inst.pid} | Threads: ${inst.threads}`);
      } else {
        ns.print(`Target: ${inst.target} | PID: ${inst.pid} | Status: stopped`);
      }
    }
    await ns.sleep(1e4);
  }
}
export {
  main
};
