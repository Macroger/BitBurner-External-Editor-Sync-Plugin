/**
 * ramPreemptiveCoordinator.js
 *
 * A Bitburner RAM pool manager that supports preemption: kills lower-priority jobs to free up RAM for high-priority requests.
 *
 * Usage: run ramPreemptiveCoordinator.js
 *
 * This is a template/example. Integrate with your attack scripts and scoring logic as needed.
 *
 * @param {NS} ns
 */
export async function main(ns) {
    // Example: List of targets with priorities (replace with your own logic)
    let targets = [
        { name: "the-hub", priority: 10 },
        { name: "netlink", priority: 9 },
        { name: "n00dles", priority: 5 },
        { name: "foodnstuff", priority: 2 },
    ];

    const host = ns.getHostname();
    const script = "uberServerAttacker.js"; // Example attack script
    const scriptRam = ns.getScriptRam(script, host);
    const maxRam = ns.getServerMaxRam(host);

    // Main loop
    while (true) 
    {
        // Sort targets by score/priority (higher priority first)
        sortQueueByScore(targets);

        // Get all running jobs on this host
        const running = ns.ps(host).filter(s => s.filename === script);

        // Track used RAM
        let usedRam = ns.getServerUsedRam(host);
        let freeRam = maxRam - usedRam;

        // Try to launch high-priority jobs first
        for (const target of targets) {
            // Check if this target is already being attacked
            const alreadyRunning = running.find(s => s.args[0] === target.name);
            if (alreadyRunning) continue;

            // Decide how many threads to use (example: try to use as much as possible)
            let threads = Math.floor(freeRam / scriptRam);
            if (threads < 1) {
                // Not enough RAM, try to preempt lower-priority jobs
                // Find the lowest-priority running job
                const lowest = running.filter(s => {
                    const t = targets.find(tar => tar.name === s.args[0]);
                    return t && t.priority < target.priority;
                }).sort((a, b) => {
                    const pa = targets.find(tar => tar.name === a.args[0]).priority;
                    const pb = targets.find(tar => tar.name === b.args[0]).priority;
                    return pa - pb;
                })[0];
                if (lowest) {
                    ns.tprint(`[PreemptiveCoordinator] Killing lower-priority job: ${lowest.args[0]} (PID ${lowest.pid})`);
                    ns.kill(lowest.pid);
                    // Wait a moment for RAM to free up
                    await ns.sleep(200);
                    // Recalculate free RAM
                    usedRam = ns.getServerUsedRam(host);
                    freeRam = maxRam - usedRam;
                    threads = Math.floor(freeRam / scriptRam);
                } else {
                    // No lower-priority jobs to kill, skip
                    continue;
                }
            }
            if (threads > 0) {
                const pid = ns.exec(script, host, threads, target.name);
                if (pid !== 0) {
                    ns.tprint(`[PreemptiveCoordinator] Launched ${script} for ${target.name} with ${threads} threads (PID ${pid})`);
                    // Update used/free RAM
                    usedRam += threads * scriptRam;
                    freeRam = maxRam - usedRam;
                }
            }
        }
        await ns.sleep(1000); // Main loop delay
    }
}
