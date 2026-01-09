/**
 * Deployer/manager script to copy attack scripts to all purchased servers and launch monoStrike.js on each.
 * Usage: run monoStrikeTargetDesignator.js [target1] [target2] ...
 * @param {NS} ns
 */

import { ensureScriptExists } from "./myFunctions.js";
export async function main(ns) 
{
    // Check for at least one target argument
    if (ns.args.length < 1) 
    {
        ns.tprintf("Usage: run monoStrikeTargetDesignator.js [target1] [target2] ...");
        ns.exit();
    }    

    // Get list of target servers from arguments
    const targets = ns.args;
    const selfName = "monoStrikeTargetDesignator"; // Script name for logging
    const attackScript = "monoStrike.js";   // Attack script used to launch attacks
    const hackScript = "local_hack.js";     // The hack script to use
    const growScript = "local_grow.js";     // The grow script to use
    const weakenScript = "local_weaken.js"; // The weaken script to use
    const scripts = [attackScript, hackScript, growScript, weakenScript];
    const purchasedServers = ns.getPurchasedServers();

    // Check if there are more targets than purchased servers
    if (targets.length > purchasedServers.length) 
    {
        ns.tprintf("Warning: More targets (%d) than purchased servers (%d). Some targets will NOT be assigned any server!", targets.length, purchasedServers.length);
    } 
    else if (purchasedServers.length < targets.length) 
    {
        ns.tprintf("Warning: Not enough purchased servers (%d) to attack all targets (%d). Some targets will not be attacked.", purchasedServers.length, targets.length);
    }

    // Assign servers to targets in round-robin fashion
    for (let i = 0; i < purchasedServers.length; ++i) 
    {
        const server = purchasedServers[i];
        const target = targets[i % targets.length];
        
        // Track if we copied any scripts
        let copiedAny = false;
        
        // Copy scripts to purchased server if missing using ensureScriptExists
        for (const script of scripts)
        {
            // ensureScriptExists returns true if script is present or successfully copied
            if (await ensureScriptExists(ns, script, server))
            {
                ns.tprintf("Copied or verified %s on %s", script, server);
                copiedAny = true;
            }
            else
            {
                ns.tprintf("ERROR: Failed to copy %s to %s", script, server);
            }
        }
        
        // All scripts are now present or verified on the server; per-script logs above provide details.
        ns.tprintf("[Status] Scripts ready on %s. Relaunching monoStrike.js with new target.", server);
        
        // Kill any running monoStrike.js on the server
        ns.scriptKill("monoStrike.js", server);
        
        // Launch monoStrike.js on the purchased server targeting the assigned target
        const freeRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
        const scriptRam = ns.getScriptRam("monoStrike.js", server);
        
        // Check if enough RAM is available to run monoStrike.js
        if (freeRam >= scriptRam) 
        {
            const pid = ns.exec("monoStrike.js", server, 1, target);
            if (pid !== 0) 
            {
                ns.tprintf("Launched monoStrike.js on %s with 1 thread targeting %s", server, target);
            } 
            else 
            {
                ns.tprintf("ERROR: Failed to launch monoStrike.js on %s", server);
            }
        } 
        else 
        {
            ns.tprintf("ERROR: Not enough free RAM to run monoStrike.js on %s (Required: %s, Available: %s)", server, ns.formatRam(scriptRam), ns.formatRam(freeRam));
        }
    }
}
