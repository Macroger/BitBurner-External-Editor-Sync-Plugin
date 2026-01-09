/**
 * Copies a specified script to all purchased servers, updating it if needed.
 * Usage: run updateScriptOnPurchasedServers.js [scriptName]
 * @param {NS} ns
 */
export async function main(ns) {
    if (ns.args.length !== 1) {
        ns.tprintf("Usage: run updateScriptOnPurchasedServers.js [scriptName]");
        ns.exit();
    }
    const script = ns.args[0];
    const purchasedServers = ns.getPurchasedServers();
    for (const server of purchasedServers) {
        if (!ns.fileExists(script, server)) {
            await ns.scp(script, server);
            ns.tprintf("Copied %s to %s (new)", script, server);
        } else {
            await ns.scp(script, server);
            ns.tprintf("Updated %s on %s", script, server);
        }
    }
    ns.tprintf("Done updating %s on all purchased servers.", script);
}
