/**
 * monoStrikeManager.js
 * Manages monoStrike scripts on a powerful server, launching, monitoring, and reporting status for each target.
 * Usage: run monoStrikeManager.js [target1] [target2] ...
 * Optionally, expand to use data ports for dynamic control.
 *
 * Place this script in servers/home/ and ensure monoStrike.js is available in the same or accessible location.
 *
 * @param {NS} ns
 */
export async function main(ns) {
    const monoStrikeScript = "monoStrike.js";
    const server = ns.getHostname();
    const targets = ns.args.length > 0 ? ns.args : ["n00dles", "foodnstuff"]; // Default targets if none provided
    const monoStrikeRam = ns.getScriptRam(monoStrikeScript, server);
    if (!monoStrikeRam) {
        ns.tprintf("ERROR: Could not determine RAM usage for %s. Ensure the script exists.", monoStrikeScript);
        return;
    }

    // Track running monoStrike instances: { target, pid, threads }
    let running = [];

    // Launch monoStrike for each target, maximizing threads per available RAM
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

    // Main loop: monitor and report status every 10 seconds
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
        // Optionally: listen for commands on a data port here
        await ns.sleep(10000);
    }
}
