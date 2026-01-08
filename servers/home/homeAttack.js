import { getRootAccess, decideServerAction } from "./myFunctions.js";

/**
 * Dynamically uses all available RAM on home to launch the largest possible attack on a target server.
 * Usage: run homeAttack.js [target]
 * @param {NS} ns
 */
export async function main(ns) {

    const selfName = "homeAttack";
    // Helper to prepend timestamp to log messages
    function logWithTimestamp(message) {
        const now = new Date().toISOString();
        ns.print(`[${now}] ${message}`);
    }
    if (ns.args.length !== 1) {
        logWithTimestamp(`[${selfName}] ERROR: Please provide a single target server hostname as an argument.`);
        ns.exit();
    }
    const target = ns.args[0];
    const thisServer = ns.getServer().hostname;
    const weakenScript = "local_weaken.js";
    const growScript = "local_grow.js";
    const hackScript = "local_hack.js";

    // Disable all built in API logging for cleaner output.
    ns.disableLog("ALL");

    logWithTimestamp(`[${selfName}] INFO: Starting attack loop on ${target} from ${thisServer}`);

    // Ensure root access
    if (!ns.hasRootAccess(target)) {
        logWithTimestamp(`[${selfName}] INFO: Attempting to gain root access to ${target}...`);
        if (!getRootAccess(ns, target)) {
            logWithTimestamp(`[${selfName}] ERROR: Could not gain root access to ${target}. Exiting.`);
            ns.exit();
        } else {
            logWithTimestamp(`[${selfName}] SUCCESS: Root access obtained for ${target}.`);
        }
    }

    while (true) {
        // Use decideServerAction for consistent action selection
        const action = decideServerAction(ns, target);
        let script, goal;
        // Calculate money percent for all actions
        const maxMoney = ns.getServerMaxMoney(target);
        let curMoney = ns.getServerMoneyAvailable(target);
        const moneyPercent = maxMoney > 0 ? ((curMoney / maxMoney) * 100).toFixed(3) : "N/A";
        let hackPreMoney = null;
        let growPreMoney = null;
        if (action === "weaken") 
        {
            script = weakenScript;
            goal = ns.getServerMinSecurityLevel(target);
            const curSec = ns.getServerSecurityLevel(target);
            const secPercent = goal > 0 ? ((curSec / goal) * 100).toFixed(3) : "N/A";
            logWithTimestamp(`[${selfName}] INFO: Decided to WEAKEN ${target} (curSec: ${curSec.toFixed(3)} / minSec: ${goal.toFixed(3)} = ${secPercent}%, money: $${ns.formatNumber(curMoney)} / $${ns.formatNumber(maxMoney)} = ${moneyPercent}%)`);
        } 
        else if (action === "grow") 
        {
            script = growScript;
            goal = Math.max(maxMoney / Math.max(curMoney, 1), 1.1);
            growPreMoney = curMoney;
            logWithTimestamp(`[${selfName}] INFO: Decided to GROW ${target} (current: $${ns.formatNumber(curMoney)}, max: $${ns.formatNumber(maxMoney)}, multiplier: ${goal.toFixed(3)}, percent: ${moneyPercent}%)`);
        } 
        else if (action === "hack") 
        {
            script = hackScript;
            goal = curMoney; // Go for the entire potential money
            hackPreMoney = curMoney;
            logWithTimestamp(`[${selfName}] INFO: Decided to HACK ${target} (target: $${ns.formatNumber(curMoney)}, hack amount: $${ns.formatNumber(goal)}, percent: ${moneyPercent}%)`);
        } else {
            logWithTimestamp(`[${selfName}] WARN: No valid action for ${target}. Sleeping.`);
            await ns.sleep(2000);
            continue;
        }

        // Calculate max threads for this server
        const scriptRam = ns.getScriptRam(script);
        const maxRam = ns.getServerMaxRam(thisServer);
        const usedRam = ns.getServerUsedRam(thisServer);
        const availableRam = maxRam - usedRam;
        const threads = Math.floor(availableRam / scriptRam);

        // Check for running scripts
        const runningScripts = ns.ps(thisServer).filter(p => p.filename === script && p.args[0] === target);
        if (runningScripts.length > 0) {
            logWithTimestamp(`[${selfName}] WARN: ${script} is already running on ${target} (${runningScripts.length} instance(s)). RAM: ${ns.formatRam(availableRam, 1)}/${ns.formatRam(maxRam, 1)}`);
        }

        logWithTimestamp(`[${selfName}] INFO: Preparing to run ${script} on ${target} with ${threads} threads (RAM: ${ns.formatRam(availableRam, 1)}/${ns.formatRam(maxRam, 1)}, Used: ${ns.formatRam(usedRam, 1)})`);

        if (threads > 0) {
            let goalStr = goal;
            if (typeof goal === 'number') {
                goalStr = `$${goal.toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3})}`;
            }
            logWithTimestamp(`[${selfName}] INFO: Executing ${script} (${threads} threads) on ${target} with goal ${goalStr}`);
            ns.exec(script, thisServer, threads, target, goal);
        } else {
            logWithTimestamp(`[${selfName}] WARN: Not enough RAM to run ${script} on ${target}. Required: ${ns.formatRam(scriptRam, 1)}, Available: ${ns.formatRam(availableRam, 1)}. Sleeping.`);
        }

        let sleepTime = 0;
        if (script === weakenScript) sleepTime = ns.getWeakenTime(target);
        else if (script === growScript) sleepTime = ns.getGrowTime(target);
        else if (script === hackScript) sleepTime = ns.getHackTime(target);
        const sleepMs = sleepTime + 500;
        const sleepSec = (sleepMs / 1000).toFixed(3);
        logWithTimestamp(`[${selfName}] INFO: Sleeping for ${sleepSec} seconds after running ${script} on ${target}.`);
        await ns.sleep(sleepMs);
        // After hack, log money gained by difference (may be affected by other scripts)
        if (action === "hack" && hackPreMoney !== null) {
            const hackPostMoney = ns.getServerMoneyAvailable(target);
            const hackGain = hackPreMoney - hackPostMoney;
            logWithTimestamp(`[${selfName}] SUCCESS: Hack on ${target} yielded $${ns.formatNumber(hackGain)} (before: $${ns.formatNumber(hackPreMoney)}, after: $${ns.formatNumber(hackPostMoney)})`);
        }
        // After grow, log money gained by difference (may be affected by other scripts)
        if (action === "grow" && growPreMoney !== null) {
            const growPostMoney = ns.getServerMoneyAvailable(target);
            const growGain = growPostMoney - growPreMoney;
            logWithTimestamp(`[${selfName}] SUCCESS: Grow on ${target} yielded $${ns.formatNumber(growGain)} (before: $${ns.formatNumber(growPreMoney)}, after: $${ns.formatNumber(growPostMoney)})`);
        }
    }
}
