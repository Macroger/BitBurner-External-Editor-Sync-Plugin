/**
 * centralizedRamAttackManager.js
 *
 * Centralized RAM manager for Bitburner: manages all attack requests, prioritizes, allocates RAM, and launches/kills jobs directly.
 * No inter-script communication needed; all logic is in this script.
 *
 * Usage: run centralizedRamAttackManager.js
 *
 * @param {NS} ns
 */
import { getValidServerList, scanForAllServers, sortQueueByScore, getServerScore, getNumThreadsToReachGoal,
     decideServerAction, formatSleepTime, getRootAccess} from "./myFunctions.js";
import { takeServerSnapshot, generateActionReport } from "./serverActionAnalyzer.js";
export async function main(ns) 
{   
        
    // Disable all built in API logging for cleaner output.
    ns.disableLog("ALL");

    /**
     * This function resets an attacker object to default values.
     * It preserves the target reference.
     * @param {*} attacker - attacker object to reset
     */
    function resetAttacker(attacker) {
        attacker.activeScript = "";
        attacker.requiredThreads = 0;
        attacker.requiredRam = 0;
        attacker.pid = 0;        
        attacker.wakeupTime = Date.now();
        attacker.status = 'pending';
        attacker.priorityScore = 0;
        attacker.currentMode = 'init';
        attacker.description = "";
        attacker.targetCurrentMoney = 0;
        attacker.targetMaxMoney = 0;
        attacker.targetCurrentSecurity = 0;
        attacker.targetMinSecurity = 0;
        attacker.preGrowthServerMoney = 0;
    }

    /**
     * Helper function to print the periodic status report.
     */
    function printStatusReport(ns) {       

        const runningAttackers = attackers.filter(a => a.status === 'running');
        const pendingAttackers = attackers.filter(a => a.status === 'pending');
        const totalThreads = runningAttackers.reduce((sum, a) => sum + a.requiredThreads, 0);
        
        // Summary section - shows overall RAM usage and attacker counts
        ns.printf(
            `${label_color}[${selfName}]: RAM:${reset_color} ${label_color}Used${reset_color} ${value_color}%s${reset_color} ${label_color}/ Max${reset_color} ${value_color}%s${reset_color} ${label_color}| Free:${reset_color} ${value_color}%s${reset_color} ${label_color}| Running:${reset_color} ${value_color}%d${reset_color} ${label_color}| Pending:${reset_color} ${value_color}%d${reset_color} ${label_color}| Total Threads Used:${reset_color} ${value_color}%d${reset_color}`,
            ns.formatRam(ns.getServerUsedRam(host)),
            ns.formatRam(maxRam),
            ns.formatRam(maxRam - ns.getServerUsedRam(host)),
            runningAttackers.length,
            pendingAttackers.length,
            totalThreads
        );

        ns.print(`\n`);

        // Print a table header for attacker stats
        ns.printf(`${header_color}[${selfName}]: %-8s %-20s %-9s %-8s %-8s %-10s %-15s %-23s %-s${reset_color}`,
            "Score", "Server Name", "Status", "Mode", "Threads", "Security", "    Money   ", "Wakeup", "Description");
        for (const attacker of attackers) 
        {         
            // Defensive: get target name as string
            let targetName = (typeof attacker.target === 'string') ? attacker.target : (attacker.target && attacker.target.name) ? attacker.target.name : '<unknown>';
            let wakeupIn = '-';

            if (attacker.status === 'running') 
            {
                const msLeft = Math.max(0, attacker.wakeupTime - Date.now());
                wakeupIn = formatSleepTime(msLeft);

            }

            const runningStatusColor = attacker.status === 'running' ? green_color : (attacker.status === 'pending' ? orange_color : red_color);
            const modeColor = attacker.currentMode === 'weaken' ? magenta_color : (attacker.currentMode === 'grow' ? green_color : (attacker.currentMode === 'hack' ? orange_color : yellow_color));
            const descriptionColor = modeColor;

            // Show truePriority if available, else fallback to priorityScore
            let displayPriority = ns.formatNumber(attacker.priorityScore, 1, 1000, true);

            ns.printf(
                `${label_color}[${selfName}]: ${reset_color}${value_color}%-8s ${reset_color}${value_color}%-20s ${reset_color}${runningStatusColor}%-9s ${reset_color}${modeColor}%-8s ${reset_color}${value_color}%-8d ${reset_color}${value_color}%3s/%-5s ${reset_color} ${value_color}%6s/%-8s${reset_color} ${value_color}%-24s${reset_color} ${descriptionColor}%-s${reset_color}`,
                displayPriority,
                targetName,
                attacker.status,
                attacker.currentMode,
                attacker.requiredThreads,
                attacker.targetCurrentSecurity.toFixed(0),
                attacker.targetMinSecurity.toFixed(0),
                ns.formatNumber(attacker.targetCurrentMoney, 1, 1000, true),
                ns.formatNumber(attacker.targetMaxMoney, 1, 1000, true),
                wakeupIn,
                attacker.description
            );
        }
    }

    // Example: List of targets
    let targetQueue = getValidServerList(ns, scanForAllServers(ns), 1, 1, true, true);

    // Get host server info - the server running this manager
    const host = ns.getHostname();

    // Get max RAM of host server
    let maxRam = ns.getServerMaxRam(host);

    // Self name for logging
    const selfName = "C.R.A.M.";

    // Setup references to the attack scripts
    const weakenScript = "local_weaken.js";
    const growScript = "local_grow.js";
    const hackScript = "local_hack.js";   
    
    let loopCounter = 0;
    const reportInterval = 1; // in loops
    const mainLoopTimeDelay = 1000; // in ms
    const attackScriptDelayBuffer = 150; // in ms

    let attackers = [];
    let attackersRequiringAction = [];

    let generateReport = false;

    // Color codes (Bitburner supports a subset of ANSI colors in tprint/tprintf)

    const blue_color = "\u001b[38;5;39m"; // Blue
    const yellow_color = "\u001b[38;5;226m"; // Yellow
    const cyan_color = "\u001b[38;5;51m"; // Cyan
    const green_color = "\u001b[38;5;46m"; // Green
    const orange_color = "\u001b[38;5;208m"; // Orange
    const magenta_color = "\u001b[38;5;201m"; // Magenta

    const delta_symbol = "\u0394"; // Greek letter delta


    const label_color = blue_color; // Blue
    const value_color = yellow_color; // Yellow
    const header_color = cyan_color; // Cyan
    const reset_color = "\u001b[0m";
    const reportSeparator = `${header_color}[${selfName}]: ====================================================================================================================${reset_color}`

    // Main loop
    while (true) 
    {
        // Periodic status logging trigger
        if (loopCounter % reportInterval === 0) 
        {
            generateReport = true;

            ns.print(`\n\n\n\n`);
            ns.print(`${reportSeparator}`);
            ns.print(`${header_color}[${selfName}]: SUCCESS: Starting main loop iteration ${value_color}${loopCounter}${reset_color} on host ${value_color}${host}${reset_color}`);
            printStatusReport(ns, loopCounter);
        } 
    
        // Get used RAM
        let usedRam = ns.getServerUsedRam(host);

        // Determine free RAM
        let freeRam = maxRam - usedRam;

        // Every 60 cycles, refresh the target list - scan for new targets
        if (loopCounter % 30 === 0) 
        {
            targetQueue = getValidServerList(ns, scanForAllServers(ns), 1, 1, true, false);
            
            // Sort by score so that the highest priority attackers are created first
            sortQueueByScore(ns, targetQueue);

            // Update max RAM in case of upgrades
            maxRam = ns.getServerMaxRam(host);

            // Check for new targets to add to attackers array
            for (const target of targetQueue) 
            {    
                // Check if an attacker for this target already exists
                const already = attackers.find(a => a.target === target);
                if(already) 
                {                    
                    continue;
                }

                // Check for and attempt to gain root access before setting up attacker unit
                if (!ns.hasRootAccess(target)) 
                {
                    const rooted = getRootAccess(ns, target);
                    if (!rooted) 
                    {
                        ns.print(`[${selfName}]: WARNING: Could not gain root access to ${target}. Skipping attack setup for this target.`);
                        continue;
                    }
                }

                let newAttacker = {
                    activeScript: "",
                    target: target,
                    requiredThreads: 0,
                    requiredRam: 0,
                    pid: 0,                    
                    wakeupTime: Date.now(),  // timestamp to wake up - for when processing an action
                    status: 'pending', // 'running' | 'pending' | 'finished'
                    priorityScore: 0,      // priority/score based on the botnet scoring method
                    currentMode: 'init', // 'hack' | 'grow' | 'weaken' | 'init'
                    description: "",
                    targetCurrentMoney: 0,
                    targetMaxMoney: 0,
                    targetCurrentSecurity: 0,
                    targetMinSecurity: 0,
                    preGrowthServerMoney: 0
                };

                attackers.push(newAttacker);

  
            }

            // Sort the regular attackers array
            attackers.sort((a, b) =>
            {
                const aScore = a.priorityScore;
                const bScore = b.priorityScore;
                return bScore - aScore; // Descending order: highest score first
            }); 
        }

        // Clear the pending action list
        attackersRequiringAction = [];

        // Go through the list of attackers and manage them
        for (const attacker of attackers) 
        {
            // If attacker is running, check if wakeup time has passed
            if (attacker.status === 'running' && attacker.wakeupTime <= Date.now()) 
            {
                // Reset to defaults so this attacker unit can be processed again
                resetAttacker(attacker);

                attackersRequiringAction.push(attacker);
            }
            else if (attacker.status === 'pending')
            {
                attackersRequiringAction.push(attacker);
            }
            else
            {
                continue;
            } 
        }

        // Go through the list of attackers requiring action and determine next steps (decide action, threads, RAM)
        for (const attacker of attackersRequiringAction)
        {         
            // Skip attack units that already have a mode decided
            if(attacker.currentMode !== 'init')
            {
                continue;
            }

            // Use the decideServerAction function to determine next action
            const action = decideServerAction(ns, attacker.target, host);

            // Based on action, calculate required threads and RAM
            let requiredThreads = 0;
            let goal = 0;

            // Setup the attackers' target server stats - these get used by the reporting and calculation functions
            attacker.targetCurrentMoney = ns.getServerMoneyAvailable(attacker.target);
            attacker.targetMaxMoney = ns.getServerMaxMoney(attacker.target);
            attacker.targetCurrentSecurity = ns.getServerSecurityLevel(attacker.target);
            attacker.targetMinSecurity = ns.getServerMinSecurityLevel(attacker.target);

            if (action === 'weaken')
            {
                attacker.activeScript = weakenScript;
                attacker.currentMode = 'weaken';                

                // Goal is to reduce to min security
                goal = attacker.targetMinSecurity;

                const currentServerSecurity = attacker.targetCurrentSecurity;
                const goalPercentChange = currentServerSecurity / goal * 100;

                attacker.description = "Weaken security by "+ ns.formatNumber((currentServerSecurity - goal), 1) + " to " + goal + ". "+ delta_symbol + "= "+ns.formatNumber(goalPercentChange, 1, 1000, true) + "%";

                requiredThreads = getNumThreadsToReachGoal(ns, attacker.activeScript, goal, attacker.target, host);
            }   
            else if (action === 'grow')
            {
                attacker.activeScript = growScript;
                attacker.currentMode = 'grow';

                // Set the pre-growth money snapshot
                attacker.preGrowthServerMoney = attacker.targetCurrentMoney;

                //  Calculate the amount to grow- the multiplcation factor that will take us from current to max money.
                const goalFactor = 1 / (attacker.targetCurrentMoney / attacker.targetMaxMoney);

                // Calculate the percent of change this represents
                const goalPercentChange = goalFactor * 100;

                // Calculate the actual dollar amount to grow
                const growAmount = attacker.targetMaxMoney - attacker.targetCurrentMoney;

                // Record the description to the attacker object
                attacker.description = "Growing money by "+ ns.formatNumber(growAmount, 1, 1000, true) + " to "+ ns.formatNumber(attacker.targetMaxMoney, 1, 1000, true)  + ". "+ delta_symbol + "= " + ns.formatNumber(goalPercentChange, 1, 1000, true) + "%";

                // Print the debug info showing the attacker's description.
                // ns.tprintf("[%s]-DEBUG: %s)", selfName, attacker.description);

                requiredThreads = getNumThreadsToReachGoal(ns, attacker.activeScript, goalFactor, attacker.target, host);   
            }
            else if (action === 'hack')
            {
                attacker.activeScript = hackScript;
                attacker.currentMode = 'hack';
                const currentMoney = attacker.targetCurrentMoney;
                const maxMoney = attacker.targetMaxMoney;
                const desiredHackPercent = 0.25; // Hack 25% of max money

                // Goal is to hack down to 75% of maxMoney, so take 25% of maxMoney
                goal = (maxMoney * desiredHackPercent);  
                
                const goalPercentChange = (goal / currentMoney) * 100;
                
                attacker.description = "Hacking money by " + ns.formatNumber(goal, 1 ,1000, true) + " to " + ns.formatNumber((attacker.targetCurrentMoney - goal), 1, 1000, true) + ". " + delta_symbol + "= " + ns.formatNumber((desiredHackPercent*100), 2, 1000, false) + "%";

                requiredThreads = getNumThreadsToReachGoal(ns, attacker.activeScript, goal, attacker.target, host);                
            }
            else
            {
                // No action needed
                resetAttacker(attacker);
                continue;
            }

            attacker.requiredThreads = requiredThreads;

            // Determine the RAM required
            const scriptRam = ns.getScriptRam(attacker.activeScript, host);
            attacker.requiredRam = requiredThreads * scriptRam;

            // Determine priority score using botnet scoring
            const idx = targetQueue.findIndex(t => t === attacker.target);
            if (idx !== -1) 
            {            
                attacker.priorityScore = getServerScore(ns, attacker.target);
            }
        }

        // Sort attackersRequiringAction by target server score (highest first)
        attackersRequiringAction.sort((a, b) => 
        {
            const aScore = a.priorityScore;
            const bScore = b.priorityScore;
            return bScore - aScore; // Descending order: highest score first
        });

        // Try to launch as many attackers as possible based on available RAM
        for (const attacker of attackersRequiringAction)
        {            
            // Filter out non-pending attackers
            if (attacker.status !== 'pending')
            {                
                continue;
            } 

            // Update the free RAM
            freeRam = maxRam - ns.getServerUsedRam(host);

            if (attacker.requiredRam <= freeRam && attacker.requiredThreads > 0)
            {                
                // Launch the attack
                const pid = ns.exec(
                    attacker.activeScript,
                    host,
                    attacker.requiredThreads,
                    attacker.target
                );

                if (pid > 0) 
                {
                    attacker.pid = pid;
                    attacker.status = 'running';
                    attacker.wakeupTime = Date.now() + 
                        (attacker.currentMode === 'weaken' ? ns.getWeakenTime(attacker.target) :
                        attacker.currentMode === 'grow' ? ns.getGrowTime(attacker.target) :
                        ns.getHackTime(attacker.target)) + attackScriptDelayBuffer;                  
                } 
                else 
                {
                    // Launch failed, keep attacker as pending and do not update wakeupTime
                    attacker.pid = 0;                    
                }
            }
            else if(attacker.requiredRam > freeRam && attacker.requiredThreads > 0)
            {
                const scriptRam = ns.getScriptRam(attacker.activeScript, host);
                
                // See if we can launch with fewer threads
                if(freeRam / scriptRam >= 1)
                {          
                   // ns.print(`[centralizedRamAttackManager] INFO: Not enough RAM to launch full attack on target ${attacker.target}. Attempting reduced threads launch.`);          
                    const maxThreadsPossible = Math.floor(freeRam / scriptRam);

                    if(maxThreadsPossible > 0)
                    {                        
                        // Launch the attack with reduced threads
                        const pid = ns.exec(
                            attacker.activeScript,
                            host,
                            maxThreadsPossible,
                            attacker.target
                        );

                        // Check if launch was successful
                        if (pid > 0) 
                        {
                            attacker.pid = pid;
                            attacker.requiredThreads = maxThreadsPossible;
                            attacker.requiredRam = maxThreadsPossible * scriptRam;
                            attacker.status = 'running';
                            attacker.wakeupTime = Date.now() + 
                                (attacker.currentMode === 'weaken' ? ns.getWeakenTime(attacker.target) :
                                attacker.currentMode === 'grow' ? ns.getGrowTime(attacker.target) :
                                ns.getHackTime(attacker.target)) + attackScriptDelayBuffer;
                            
                        }
                        else 
                        {
                            // Launch failed, keep attacker as pending and do not update wakeupTime
                            attacker.pid = 0;
                        }
                    }
                }
                else
                {
                    // Not enough RAM to launch - also means we can't launch any more attackers this cycle.                    
                    // Break to return to the main loop to sleep and check again next cycle
                    break;
                }
            }
        }

        // Get the list of currently running scripts on this host
        const running = ns.ps(host);

        // Print the final seperator after the report 
        if (generateReport) 
        {
            ns.print(`${reportSeparator}`);
            generateReport = false;
        }

        // Increment loop counter
        loopCounter++;

        await ns.sleep(mainLoopTimeDelay); // Main loop delay
    }
}
