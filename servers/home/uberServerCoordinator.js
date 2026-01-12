/**
 * uberServerCoordinator.js
 * Manages uberServerAttacker scripts on a powerful server, using data port commands and your myFunctions.js utilities.
 *
 * Usage: run uberServerCoordinator.js 
 *
 * Requires: myFunctions.js in the same directory or accessible path.
 *
 * @param {NS} ns
 */
import { getValidServerList, logWithTimestamp, scanForAllServers, sortQueueByScore } from "./myFunctions.js";

export async function main(ns)     
{
    // Helper: Calculate threads needed to hack 50% of server's money, capped at 10,000
    function getHackThreadsToHalf(target) 
    {
        const hackPercent = ns.hackAnalyze(target);
        if (!isFinite(hackPercent) || hackPercent <= 0) return 1;
        
        // Calculate the number of  threads needed to hack 50% of the server's money
        // Formula: threads = 0.5 / hackPercent
        // This gives the number of threads needed to hack 50% of the money by 
        // dividing the desired hack fraction (0.5) by the fraction hacked per thread (hackPercent).
        let threads = Math.ceil(0.5 / hackPercent);
        
        if (!isFinite(threads) || threads < 1) threads = 1;
        return Math.min(threads, 10000);
    }

    // Estimate the maximum threads needed for a target (worst-case: grow or hack)
    function estimateMaxThreads(ns, target) 
    {
        // Threads to grow from current money to max
        const growThreads = Math.ceil(
            ns.growthAnalyze(
                target,
                ns.getServerMaxMoney(target) / Math.max(ns.getServerMoneyAvailable(target), 1)
            )
        );
        
        // Threads to hack from 100% to 75% money (25% hack)
        const hackThreads = Math.ceil(0.25 / ns.hackAnalyze(target));

        // Return the higher of the two
        return Math.max(growThreads, hackThreads);
    }
    
    // Helper to score and sort servers like new_sniffer.js botnet mode
    function sortQueueByBotnetScore(queue) {
        // Score: (maxMoney * growth) / minSec
        queue.sort((a, b) => {
            const aName = a.name || a;
            const bName = b.name || b;
            const aMaxMoney = ns.getServerMaxMoney(aName);
            const aGrowth = ns.getServerGrowth(aName);
            const aMinSec = ns.getServerMinSecurityLevel(aName);
            const aScore = (aMaxMoney > 0 && aMinSec > 0) ? (aMaxMoney * aGrowth) / aMinSec : -Infinity;
            const bMaxMoney = ns.getServerMaxMoney(bName);
            const bGrowth = ns.getServerGrowth(bName);
            const bMinSec = ns.getServerMinSecurityLevel(bName);
            const bScore = (bMaxMoney > 0 && bMinSec > 0) ? (bMaxMoney * bGrowth) / bMinSec : -Infinity;
            return bScore - aScore;
        });
    }

    const uberServerAttackerScript = "uberServerAttacker.js";
    const host = ns.getHostname();
    // const portNum = ns.args[0] || 1;
    // const port = ns.getPortHandle(portNum);

    const weakenScript = "local_weaken.js";
    const growScript = "local_grow.js";
    const hackScript = "local_hack.js";

    let running = [];
    let queue = [];

    const maxRam = ns.getServerMaxRam(host);

    // Get the highest RAM cost among the attack scripts
    const highestAttackScriptRamCost = Math.max(
        ns.getScriptRam(weakenScript, host),
        ns.getScriptRam(growScript, host),
        ns.getScriptRam(hackScript, host)
    );

    const uberServerAttackerRamCost = ns.getScriptRam(uberServerAttackerScript, host);
    
    let freeRam; 

    // Initial population of queue (all valid targets)
    const allServers = scanForAllServers(ns);
    queue = getValidServerList(ns, allServers, 1, 1, true, false);

    sortQueueByScore(queue);
    freeRam = maxRam - ns.getServerUsedRam(host);

    // ANSI color codes
    const yellow = "\u001b[33m";
    const red = "\u001b[31m";
    const green = "\u001b[32m";
    const reset = "\u001b[0m";

    for (const target of queue) 
    {        
        // Calculate threads needed to hack 25% (from 100% to 75%) of money for this target
        // Uses Math.min to ensure the end result is always less than 10000, and Math.max to ensure at least 1 thread.
        // Math.floor is used to ensure we don't allocate fractional threads.
        const instanceAllocatedThreads = Math.max(1, Math.min(10000, Math.floor(estimateMaxThreads(ns, target) * 1.2))); // Add 20% buffer

        // Calculate the score for this server (same as sort)
        const maxMoney = ns.getServerMaxMoney(target);
        const growth = ns.getServerGrowth(target);
        const minSec = ns.getServerMinSecurityLevel(target);
        const score = (maxMoney > 0 && minSec > 0) ? (maxMoney * growth) / minSec : -Infinity;

        // Use highestAttackScriptRamCost as the worst-case for this instance
        const ramNeeded = (instanceAllocatedThreads * highestAttackScriptRamCost) + uberServerAttackerRamCost;

        if (freeRam < ramNeeded)
        {
            // Use template literals only, no printf placeholders
            logWithTimestamp(ns, `${yellow}[uberServerCoordinator] WARNING: Not enough RAM to launch instance for ${target} (need ${ns.formatRam(ramNeeded)}, have ${ns.formatRam(freeRam)})${reset}`, true);
            continue;
        }

        // Launch uberServerAttacker instance, passing instanceAllocatedThreads as an argument
        const pid = ns.exec(uberServerAttackerScript, host, 1, target, instanceAllocatedThreads);

        if (pid !== 0) 
        {
            running.push({ target, pid, instanceAllocatedThreads, score });
            logWithTimestamp(ns, `${green}[uberServerCoordinator] Launched for ${target}: PID ${pid}, AllocatedThreads ${instanceAllocatedThreads}, Score ${ns.formatNumber(score, 2, 1000, true)}${reset}`, true);
            freeRam -= ramNeeded;
        } 
        else 
        {
            logWithTimestamp(ns, `${red}[uberServerCoordinator] ERROR: Failed to launch for ${target}${reset}`, true);
        }
    }

    logWithTimestamp(ns, "[uberServerCoordinator] Launch complete. Instances running:", true);
    for (const inst of running) 
    {
        logWithTimestamp(ns, `  Target: ${inst.target} | PID: ${inst.pid} | Threads: ${inst.instanceAllocatedThreads} | Score: ${ns.formatNumber(inst.score, 2, 1000, true)}`, true);
    }
}

