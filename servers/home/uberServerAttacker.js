import { getRootAccess, decideServerAction, launchScriptAttack, logWithTimestamp } from "./myFunctions.js";

/**
 * uberServerAttacker.js
 *
 * Orchestrator-compatible advanced attack script, based on monoStrike.js.
 * Reports state to a designated port.
 *
 * Usage: run uberServerAttacker.js [target] [maxAllowedThreads] [reserveThreads] [statusPort=2]
 *
 * @param {NS} ns
 */
export async function main(ns) {

    /**
     * Reports the current status to the designated status port.
     * Writes the status as a JSON string to the port.
     *
     * @param {*} [extra={}] Additional data to include in the status report.
     * @return {void}
     * @example
     * reportStatus({ customField: "customValue" });
     */
    function reportStatus(extra = {}) 
    {
        const runningScript = ns.getRunningScript();
        const status = {
            thisServer,
            pid: ns.pid,
            target,
            state,
            action,
            threads: ns.args.threads || 1,
            timestamp: Date.now(),
            runTime: runningScript ? runningScript.onlineRunningTime : null, // uptime in seconds
            ...extra
        };
        statusPort.write(JSON.stringify(status));
    }

    const attackerStates = {
        INITIALIZING: "initializing",
        GAINING_ROOT: "gaining_root",
        ATTACKING: "attacking",
        IDLE: "idle",
        ERROR: "error"
    }
       
    // Disable all built in API logging for cleaner output.
    ns.disableLog("ALL");

    // Parse the target from the first argument
    const target = ns.args[0];

    // Parse optional reserveThreads and statusPort arguments    
    const maxAllowedThreads = ns.args.length > 1 ? Number(ns.args[1]) : 10000; // Default to 10000 if not provided
    const reserveThreads = ns.args.length > 2 ? Number(ns.args[2]) : 0; // Default to 0 if not provided
    const statusPortNum = ns.args.length > 3 ? Number(ns.args[3]) : 2; // Default to port 2 if not provided

    // Name of this script for status reporting
    const selfName = "uberServerAttacker";
    
    // Setup the status port handle - this is used to report status back to the orchestrator via a data port
    const statusPort = ns.getPortHandle(statusPortNum);
   
    // Get the hostname of the server this script is being run on
    const thisServer = ns.getServer().hostname;
        
    // Default sleep fraction for fallback (e.g., when script is already running or not enough RAM)
    const fallbackSleepFraction = 0.25;
        
    // Setup references to the attack scripts
    const weakenScript = "local_weaken.js";
    const growScript = "local_grow.js";
    const hackScript = "local_hack.js";

    // Variables to track state and action
    let state = attackerStates.INITIALIZING;
    let action = "none";

    // Log initialization
    logWithTimestamp(ns, `[${selfName}] INFO: Starting uberServerAttacker on ${thisServer} targeting ${target} with ${reserveThreads} reserved threads.`);

    // Ensure root access
    if (!ns.hasRootAccess(target)) 
    {
        state = attackerStates.GAINING_ROOT;
        logWithTimestamp(ns, `[${selfName}] WARNING: Access NOT granted. Attempting to gain root access to ${target}...`);
        if (!getRootAccess(ns, target)) 
        {
            state = attackerStates.ERROR;
            logWithTimestamp(ns, `[${selfName}] ERROR: Could not gain root access to ${target}. Exiting.`);
            reportStatus({ error: "Could not gain root access" });
            ns.exit();
        }
        else
        {
            let message = `[${selfName}] SUCCESS: Gained root access to ${target}.`;
            logWithTimestamp(ns, message);
        }
    }

    // Log start of attack loop
    logWithTimestamp(ns, `[${selfName}] SUCCESS: Starting attack loop on ${target} from ${thisServer}`); 

    state = attackerStates.ATTACKING;

    while (true) 
    {
        // Determine the best action to take against the target
        const action = decideServerAction(ns, target, thisServer);

        // Setup variables for the chosen action
        let script, goal, sleepTime;

        const currentMoneyString = `${ns.formatNumber(ns.getServerMoneyAvailable(target), 2, 1000, true)} / ${ns.formatNumber(ns.getServerMaxMoney(target), 2, 1000, true)}`;        

        // Determine script and goal based on action
        if (action === "weaken") 
        {
            script = weakenScript;
            goal = ns.getServerMinSecurityLevel(target);
            const currentSecurityString = `${ns.getServerSecurityLevel(target).toFixed(2)} / ${ns.getServerMinSecurityLevel(target).toFixed(2)}`;
            const minSecurityString = ns.getServerMinSecurityLevel(target).toFixed(2);

            // Log decision
            logWithTimestamp(ns, `[${selfName}] INFO: Decided to WEAKEN ${target} to reach min security level ${goal}.
                Current security: ${currentSecurityString}, Min Security: ${minSecurityString}. (Desired percent change: ${((ns.getServerSecurityLevel(target) - goal) / ns.getServerSecurityLevel(target) * 100).toFixed(2)}%)`);
        } 
        else if (action === "grow") 
        {
            script = growScript;
            goal = ns.getServerMaxMoney(target) / Math.max(ns.getServerMoneyAvailable(target), 1);

            // Format percent change with abbreviations, no currency symbol
            const percentChange = (goal - 1) * 100;
            const percentChangeStr = ns.formatNumber(percentChange, 2, 1000, false); // no currency symbol
            logWithTimestamp(ns, `[${selfName}] INFO: Decided to GROW ${target} to reach max money.
                Current money: ${currentMoneyString} (percent change: ${percentChangeStr}%)`);
        } 
        else if (action === "hack") 
        {
            script = hackScript;
            
            // Hack server with goal of 75% of max money
            const hackStopThreshold = ns.getServerMaxMoney(target) * 0.75;
            goal = ns.getServerMoneyAvailable(target) - hackStopThreshold;
            
            // Clamp goal to at least 1 to avoid zero/negative values
            goal = Math.max(goal, 1);

            // Log decision
            logWithTimestamp(ns, `[${selfName}] INFO: Decided to HACK ${target} down to 75% of max money.
                Current money: ${ns.formatNumber(ns.getServerMoneyAvailable(target), 2, 1000, true)} / ${ns.formatNumber(ns.getServerMaxMoney(target), 2, 1000, true)} (target reduction: ${ns.formatNumber(goal, 2, 1000, true)})`);
        }
        else 
        {
            state = "idle";

            // Log idle state
            logWithTimestamp(ns, `[${selfName}] INFO: No action needed against ${target}. Idling.`);
            await ns.sleep(1000);
            continue;
        }

        // If the appropriate script is already running on the target, skip launching a new one
        const runningScripts = ns.ps(thisServer).filter(s => s.filename === script && s.args[0] === target);

        if (runningScripts.length > 0) 
        {
            // Script is already running, sleep for a fraction of the action time and check again
            if (action === "weaken") sleepTime = (ns.getWeakenTime(target) * fallbackSleepFraction);
            else if (action === "grow") sleepTime = (ns.getGrowTime(target) * fallbackSleepFraction);
            else if (action === "hack") sleepTime = (ns.getHackTime(target) * fallbackSleepFraction);
            
            // Sleep and continue
            logWithTimestamp(ns, `[${selfName}] INFO: ${script} is already running against ${target}. Sleeping for ${sleepTime} ms.`);
            await ns.sleep(sleepTime);
            continue;
        }

        // Launch attack
        const attackResult = launchScriptAttack(
            ns,                 // ns instance
            script,             // script to run
            target,             // target server
            thisServer,         // host server
            goal,               // goal (depends on action)
            maxAllowedThreads,  // max allowed threads for this attack
            reserveThreads,     // threads to reserve on host
            true                // use local mode for launching the attacks
        );

        if (script === weakenScript) sleepTime = ns.getWeakenTime(target) + 150;
        else if (script === growScript) sleepTime = ns.getGrowTime(target) + 150;
        else if (script === hackScript) sleepTime = ns.getHackTime(target) + 150;

        if (attackResult.success == false) 
        {
            // Create a fallback sleep time based on a fraction of the intended sleep time
            const fallbackSleepMs = Math.max(250, Math.floor(sleepTime * fallbackSleepFraction));
            
            // Log the failure reason
            if (attackResult.reason === "Not enough RAM available") 
            {
                logWithTimestamp(ns, `[${selfName}] WARNING: Not enough RAM to launch ${script} against ${target}. Sleeping for ${fallbackSleepMs} ms.`);
                reportStatus({ error: "Not enough RAM to launch attack", sleepTime: fallbackSleepMs });
            } 
            else 
            {
                logWithTimestamp(ns, `[${selfName}] ERROR: Failed to launch ${script} against ${target}. Reason: ${attackResult.reason}. Sleeping for ${fallbackSleepMs} ms.`);
                reportStatus({ error: "Attack failed", reason: attackResult.reason });
            }

            await ns.sleep(fallbackSleepMs);
            continue;
        }

        // Only one status report per loop, after a successful attack attempt
        reportStatus({ lastAttack: { action, script, result: attackResult } });
        await ns.sleep(sleepTime);
    }
}
