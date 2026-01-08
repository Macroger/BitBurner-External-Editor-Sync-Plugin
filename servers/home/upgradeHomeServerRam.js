/** @param {NS} ns */
export async function main(ns) {
    const success = ns.upgradeHomeRam();
    if (success) {
        ns.tprintf("SUCCESS: Home RAM upgrade purchased. New RAM: %d GB", ns.getServerMaxRam("home"));
    } else {
        ns.tprintf("ERROR: Could not upgrade home RAM. Check funds and upgrade limits.");
    }

    
}