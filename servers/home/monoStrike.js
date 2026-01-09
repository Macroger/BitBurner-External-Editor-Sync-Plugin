import { getRootAccess, decideServerAction, launchScriptAttack } from "./myFunctions.js";

/**
 * monoStrike.js
 *
 * Description:
 *   This script is designed to focus all available RAM on a single server (typically home, but works on any server) to launch the largest possible attack against a specified target.
 *   It dynamically chooses between weaken, grow, and hack operations based on the target's current state, maximizing efficiency and profit.
 *   The script will loop indefinitely, automatically adapting to the target's security and money levels, and will attempt to gain root access if needed.
 *
 * Features:
 *   - Dynamically selects the optimal action (weaken, grow, hack) for the target server.
 *   - Uses all available RAM except for an optional reserved amount (reserveThreads).
 *   - Automatically attempts to gain root access if not already available.
 *   - Provides detailed, timestamped log output for every action and result.
 *   - Can be run from any server with sufficient RAM, not just home.
 *
 * Usage:
 *   run monoStrike.js [target] [reserveThreads]
 *
 *   [target]         - (required) The hostname of the server to attack (e.g., "n00dles").
 *   [reserveThreads] - (optional) Number of threads to reserve (default: 0). Useful if you want to leave RAM for other scripts.
 *
 * Example:
 *   run monoStrike.js n00dles 2
 *     - Attacks the server "n00dles" using all available RAM except for what would be used by 2 threads.
 *
 * Notes:
 *   - This script is intended for Bitburner players who want a "set-and-forget" attack loop that adapts to the target's state.
 *   - It is especially useful for early- and mid-game money farming, server prepping, or as a utility for purchased servers.
 *
 * @param {NS} ns - The Bitburner Netscript API object.
 */


/**
 *  Prepends a timestamp to log messages for better tracking.
 * @param {string} message - The message to log
 */
function logWithTimestamp(ns, message) 
{
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8); // HH:MM:SS
    ns.print(`[${timeStr}] ${message}`);
}

/**
 * Formats a sleep time in milliseconds into a human-readable string.
 * Uses the format "X minute(s) Y second(s)".
 *
 * @param {number} ms - Sleep time in milliseconds
 * @return {string} - Formatted string representing the sleep time
 */
function formatSleepTime(ms) 
{
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    let result = "";
    if (minutes > 0) result += `${minutes} minute${minutes !== 1 ? "s" : ""}`;
    if (minutes > 0 && seconds > 0) result += " ";
    if (seconds > 0) result += `${seconds} second${seconds !== 1 ? "s" : ""}`;
    if (result === "") result = "less than 1 second";
    return result;
}

export async function main(ns) 
{
    // Disable all built in API logging for cleaner output.
    ns.disableLog("ALL");

    // Perform initial checks before proceeding

    // Check for correct number of arguments
    if (ns.args.length < 1 || ns.args.length > 2) 
    {
        logWithTimestamp(ns, `[${selfName}] ERROR: Usage: run monoStrike.js [target] [reserveThreads=0]`);
        ns.exit();
    }

    // Check for reserve threads argument - optional, defaults to 0
    const reserveThreads = ns.args.length > 1 ? Number(ns.args[1]) : 0;
   
    // Validate reserveThreads - must be a non-negative integer
    if (isNaN(reserveThreads) || reserveThreads < 0) 
    {
        logWithTimestamp(ns, `[${selfName}] ERROR: reserveThreads must be a non-negative integer.`);
        ns.exit();
    }

    const selfName = "monoStrike"; // Script name for logging
    const target = ns.args[0];  // Target server to attack

    // Get the name of the current server this script is being run on
    const thisServer = ns.getServer().hostname; 

    const defaultSleep = 2000; // Default sleep time if no action is taken
    
    // Setup references to the attack scripts
    const weakenScript = "local_weaken.js";
    const growScript = "local_grow.js";
    const hackScript = "local_hack.js";

    // Ensure root access
    if (!ns.hasRootAccess(target)) 
    {
        logWithTimestamp(ns, `[${selfName}] INFO: Attempting to gain root access to ${target}...`);
        if (!getRootAccess(ns, target)) 
        {
            logWithTimestamp(ns, `[${selfName}] ERROR: Could not gain root access to ${target}. Exiting.`);
            ns.exit();
        } 
        else 
        {
            logWithTimestamp(ns, `[${selfName}] SUCCESS: Root access obtained for ${target}.`);
        }
    }

    // Log start of attack loop
    logWithTimestamp(ns, `[${selfName}] SUCCESS: Starting attack loop on ${target} from ${thisServer}`);    

    while (true) 
    {
        // Use decideServerAction for consistent action selection
        const action = decideServerAction(ns, target);

        // Get current server stats
        const minSec = ns.getServerMinSecurityLevel(target); // Minimum security level
        const curSec = ns.getServerSecurityLevel(target);    // Current security level
        const maxMoney = ns.getServerMaxMoney(target);       // The maximum money on the server
        const curMoney = ns.getServerMoneyAvailable(target); // Current money available on the server

        // Variables to track pre-attack money for logging
        let hackPreMoney = null;
        let growPreMoney = null;

        // Create variables for script selection and goal
        let script, goal;

        // Choose script and goal based on action
        if (action === "weaken")
        {
            script = weakenScript;
            goal = (minSec > 0 ? minSec: 1); // Ensure goal is at least 1 to avoid division by zero;     
            
            // Calculate security percentage for logging - the ratio of current security to minimum security
            const secPercent = ((curSec / goal) * 100).toFixed(1);

            // Log decision
            logWithTimestamp(ns, `[${selfName}] INFO: Decided to WEAKEN ${target}; Server Security: ${curSec.toFixed(1)} / ${goal.toFixed(1)} = ${secPercent}%`);
        }
        else if (action === "grow")
        {
            script = growScript;
            // Always try to reach maxMoney for clarity
            goal = maxMoney / Math.max(curMoney, 1);
            growPreMoney = curMoney;
            logWithTimestamp(ns, `[${selfName}] INFO: Decided to GROW ${target}; Server Money: $${ns.formatNumber(curMoney)} / $${ns.formatNumber(maxMoney)}`);
        }
        else if (action === "hack")
        {
            script = hackScript;
            goal = curMoney;
            hackPreMoney = curMoney;
            logWithTimestamp(ns, `[${selfName}] INFO: Decided to HACK ${target}; Server Money: $${ns.formatNumber(curMoney)} / $${ns.formatNumber(maxMoney)}`);
        }
        else
        {
            logWithTimestamp(ns, `[${selfName}] WARN: No valid action for ${target}. Sleeping.`);
            await ns.sleep(defaultSleep);
            continue;
        }

        // If the appropriate script is already running on the target, skip launching a new one
        const runningScripts = ns.ps(thisServer).filter(s => s.filename === script && s.args[0] === target);

        if (runningScripts.length > 0)
        {
            logWithTimestamp(ns, `[${selfName}] INFO: Detected ${script} already running on ${target}. Sleeping for ${formatSleepTime(defaultSleep)}.`); 
            
            // Sleep for a short duration before re-evaluating
            await ns.sleep(defaultSleep);

            continue; // Skip launching a new script
        }

        // Use launchScriptAttack to handle threads, RAM, and execution
        // This function will handle all thread and RAM calculations and launch the script if possible
        const attackSuccess = launchScriptAttack(
            ns,         // NS object
            script,     // Script to run
            target,     // Target server
            thisServer, // Server to run the script on (home)
            goal,       // Goal for the action
            reserveThreads, // Reserve threads on home
            true // localMode: Run scripts locally on home
        );

        if (!attackSuccess)
        {
            logWithTimestamp(ns, `[${selfName}] WARN: Not enough RAM to run ${script} on ${target}. Sleeping for ${formatSleepTime(defaultSleep)}.`);

            await ns.sleep(defaultSleep);

            continue; // Skip further processing if attack did not run
        }
        else
        {}

        let sleepTime = 0;
        
        // Determine sleep time based on action
        if (script === weakenScript) sleepTime = ns.getWeakenTime(target);
        else if (script === growScript) sleepTime = ns.getGrowTime(target);
        else if (script === hackScript) sleepTime = ns.getHackTime(target);
        
        // Create a sleep time based on the action time plus a buffer

        const sleepBuffer = 250; // 250ms buffer to ensure completion
        let sleepMs = sleepTime + sleepBuffer;     
        
        ns.tprintf(`[${selfName}] INFO: Sleeping for ${formatSleepTime(sleepMs)} after running ${script} on ${target}.`);

        await ns.sleep(sleepMs);

        // After hack, log money gained by difference (may be affected by other scripts)
        if (action === "hack" && hackPreMoney !== null) 
        {
            const hackPostMoney = ns.getServerMoneyAvailable(target);
            const hackGain = hackPreMoney - hackPostMoney;
            logWithTimestamp(ns, `[${selfName}] SUCCESS: Hack on ${target} yielded $${ns.formatNumber(hackGain)} (before: $${ns.formatNumber(hackPreMoney)}, after: $${ns.formatNumber(hackPostMoney)})`);
        }

        // After grow, log money gained by difference (may be affected by other scripts)
        else if (action === "grow" && growPreMoney !== null) 
        {
            const growPostMoney = ns.getServerMoneyAvailable(target);
            const growGain = growPostMoney - growPreMoney;
            logWithTimestamp(ns, `[${selfName}] SUCCESS: Grow on ${target} yielded $${ns.formatNumber(growGain)} (before: $${ns.formatNumber(growPreMoney)}, after: $${ns.formatNumber(growPostMoney)})`);
        }
    }
}
