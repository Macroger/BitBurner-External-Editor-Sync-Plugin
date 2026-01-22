import { scanForAllServers, getValidServerList } from "./myFunctions.js";
/** @param {NS} ns */
export async function main(ns) {

    let servers = scanForAllServers(ns);
    let targetQueue = getValidServerList(ns, scanForAllServers(ns), 1, 1, true, false);
    let totalRam = 0;
    let accessibleRam = 0;

    for (let server of servers) {

        let ram = ns.getServerMaxRam(server.name);
        totalRam += ram;

        // ns.tprintf("Server: %s, RAM: %s", server.name, ns.formatRam(ram));
    }

    ns.tprintf("Total RAM across all servers: %s", ns.formatRam(totalRam));
    ns.tprintf("Found %s servers in total.", servers.length);

    for(let target of targetQueue) {
        let ram = ns.getServerMaxRam(target);
        accessibleRam += ram;

        // ns.tprintf("Server: %s, RAM: %s", target, ns.formatRam(ram));
    }

    ns.tprintf("Total Accessible RAM: %s", ns.formatRam(accessibleRam));
    ns.tprintf("Found %s accessible servers.", targetQueue.length);

}