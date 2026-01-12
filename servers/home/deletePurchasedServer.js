/**
 * Deletes a purchased server after stopping all scripts running on it.
 * Usage: run deletePurchasedServer.js [hostname]
 * @param {NS} ns - Netscript API
 */
export async function main(ns) {
    const hostname = ns.args[0];
    if (!hostname) {
        ns.tprint("ERROR: No hostname provided. Usage: run deletePurchasedServer.js [hostname]");
        return;
    }
    if (!ns.serverExists(hostname)) {
        ns.tprint(`ERROR: Server '${hostname}' does not exist.`);
        return;
    }
    if (!ns.getPurchasedServers().includes(hostname)) {
        ns.tprint(`ERROR: Server '${hostname}' is not a purchased server.`);
        return;
    }
    // Stop all scripts on the server
    const runningScripts = ns.ps(hostname);
    for (const script of runningScripts) {
        ns.scriptKill(script.filename, hostname);
    }
    // Wait a short moment to ensure scripts are killed
    await ns.sleep(100);
    // Delete the server
    if (ns.deleteServer(hostname)) {
        ns.tprint(`SUCCESS: Server '${hostname}' deleted.`);
    } else {
        ns.tprint(`ERROR: Failed to delete server '${hostname}'.`);
    }
}
