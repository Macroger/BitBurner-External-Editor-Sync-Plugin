/**
 * ramManagedAttacker.js
 *
 * Attacker script for Bitburner that requests RAM/thread allocation from a RAM pool manager before launching.
 * Based on uberServerAttacker.js, adapted for RAM-managed execution.
 *
 * Usage: run ramManagedAttacker.js [target] [desiredThreads] [priority] [requestPort=3] [approvalPort=4]
 *
 * @param {NS} ns
 */
export async function main(ns) {
    const target = ns.args[0];
    const desiredThreads = ns.args.length > 1 ? Number(ns.args[1]) : 1;
    const priority = ns.args.length > 2 ? Number(ns.args[2]) : 1;
    const requestPortNum = ns.args.length > 3 ? Number(ns.args[3]) : 3;
    const approvalPortNum = ns.args.length > 4 ? Number(ns.args[4]) : 4;

    const requestPort = ns.getPortHandle(requestPortNum);
    const approvalPort = ns.getPortHandle(approvalPortNum);
    const selfName = "ramManagedAttacker";
    const thisServer = ns.getServer().hostname;

    // Step 1: Request RAM allocation
    const request = {
        target,
        desiredThreads,
        priority,
        server: thisServer,
        pid: ns.pid,
        timestamp: Date.now()
    };
    requestPort.write(JSON.stringify(request));
    ns.tprint(`[${selfName}] Requested ${desiredThreads} threads for ${target} (priority ${priority})`);

    // Step 2: Wait for approval
    let grantedThreads = 0;
    while (true) {
        if (!approvalPort.empty()) {
            const msg = approvalPort.read();
            try {
                const approval = JSON.parse(msg);
                if (approval.pid === ns.pid) {
                    grantedThreads = approval.grantedThreads;
                    break;
                }
            } catch (e) {
                // Ignore parse errors
            }
        }
        await ns.sleep(100);
    }
    ns.tprint(`[${selfName}] Approved for ${grantedThreads} threads on ${target}`);

    // Step 3: Launch attack (example: hack)
    if (grantedThreads > 0) {
        // Replace with your actual attack logic
        ns.tprint(`[${selfName}] Attacking ${target} with ${grantedThreads} threads...`);
        // Example: run hack for grantedThreads
        await ns.hack(target, { threads: grantedThreads });
        ns.tprint(`[${selfName}] Attack complete for ${target}`);
    } else {
        ns.tprint(`[${selfName}] No threads granted, exiting.`);
    }
}
