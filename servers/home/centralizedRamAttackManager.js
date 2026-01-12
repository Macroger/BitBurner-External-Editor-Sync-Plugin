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
import { getValidServerList, scanForAllServers, sortQueueByScore, getNumThreadsToReachGoal, decideServerAction, formatSleepTime} from "./myFunctions.js";
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
        attacker.requiredThreads = 0;
        attacker.requiredRam = 0;
        attacker.pid = 0;
        attacker.activeScript = "";
        attacker.wakeupTime = Date.now();
        attacker.status = 'pending';
        attacker.priorityScore = 0;
        attacker.currentMode = 'init';
        attacker.beforeSnapshot = null;
        attacker.afterSnapshot = null;
    } 

    // Example: List of targets
    let targetQueue = getValidServerList(ns, scanForAllServers(ns), 1, 1, true, true);

    // Get host server info - the server running this manager
    const host = ns.getHostname();

    // Get max RAM of host server
    const maxRam = ns.getServerMaxRam(host);

    // Setup references to the attack scripts
    const weakenScript = "local_weaken.js";
    const growScript = "local_grow.js";
    const hackScript = "local_hack.js";   
    
    let loopCounter = 0;

    let attackers = [];
    let attackersRequiringAction = [];

    // Main loop
    while (true) 
    {
        // Periodic status logging (every cycle)
        if (loopCounter % 10 === 0) 
        {
            ns.print(`\n\n\n\n`);
            // Color codes (Bitburner supports a subset of ANSI colors in tprint/tprintf)
            const colorLabel = "\u001b[38;5;39m"; // Blue
            const colorValue = "\u001b[38;5;226m"; // Yellow
            const colorHeader = "\u001b[38;5;51m"; // Cyan
            const colorReset = "\u001b[0m";

            ns.print(`${colorHeader}[centralizedRamAttackManager]  ==========================================================${colorReset}`);
            ns.print(`${colorHeader}[centralizedRamAttackManager] SUCCESS: Starting main loop iteration ${colorValue}${loopCounter}${colorReset} on host ${colorValue}${host}${colorReset}`);

            const runningAttackers = attackers.filter(a => a.status === 'running');
            const pendingAttackers = attackers.filter(a => a.status === 'pending');
            const totalThreads = runningAttackers.reduce((sum, a) => sum + a.requiredThreads, 0);
            ns.printf(
                `${colorLabel}[centralizedRamAttackManager] RAM:${colorReset} ${colorLabel}Used${colorReset} ${colorValue}%s${colorReset} ${colorLabel}/ Max${colorReset} ${colorValue}%s${colorReset} ${colorLabel}| Free:${colorReset} ${colorValue}%s${colorReset} ${colorLabel}| Running:${colorReset} ${colorValue}%d${colorReset} ${colorLabel}| Pending:${colorReset} ${colorValue}%d${colorReset} ${colorLabel}| Total Threads Used:${colorReset} ${colorValue}%d${colorReset}`,
                ns.formatRam(ns.getServerUsedRam(host)),
                ns.formatRam(maxRam),
                ns.formatRam(maxRam - ns.getServerUsedRam(host)),
                runningAttackers.length,
                pendingAttackers.length,
                totalThreads
            );

            ns.print(`\n`);

            // Print a table header for attacker stats
            ns.printf(`${colorHeader}[centralizedRamAttackManager] %-18s %-8s %-10s %-10s %-10s %-10s %-10s %-10s${colorReset}`,
                "Target", "Status", "Mode", "Threads", "RAM", "PID", "Wakeup", "Priority");
            for (const attacker of attackers) {
                // Defensive: get target name as string
                let targetName = (typeof attacker.target === 'string') ? attacker.target : (attacker.target && attacker.target.name) ? attacker.target.name : '<unknown>';
                let wakeupIn = attacker.status === 'running' ? Math.max(0, Math.round((attacker.wakeupTime - Date.now()) / 1000)) + 's' : '-';
                ns.printf(
                    `${colorLabel}[centralizedRamAttackManager]${colorReset} ${colorValue}%-18s${colorReset} ${colorValue}%-8s${colorReset} ${colorValue}%-10s${colorReset} ${colorValue}%-10d${colorReset} ${colorValue}%-10s${colorReset} ${colorValue}%-10d${colorReset} ${colorValue}%-10s${colorReset} ${colorValue}%-10d${colorReset}`,
                    targetName,
                    attacker.status,
                    attacker.currentMode,
                    attacker.requiredThreads,
                    ns.formatRam(attacker.requiredRam),
                    attacker.pid || 0,
                    wakeupIn,
                    attacker.priorityScore
                );
            }
        }       

        // Get used RAM
        let usedRam = ns.getServerUsedRam(host);

        // Determine free RAM
        let freeRam = maxRam - usedRam;

        // Every 120 cycles, refresh the target list - scan for new targets
        if (loopCounter % 120 === 0) 
        {
            //ns.print(`[centralizedRamAttackManager] Refreshing target list...`);

            targetQueue = getValidServerList(ns, scanForAllServers(ns), 1, 1, true, false);
            sortQueueByScore(ns, targetQueue);
            loopCounter = 0;

            // Check for new targets to add to attackers array
            for (const target of targetQueue) 
            {                                 
                // Defensive: Ensure target exists
                if (!target) {
                    //ns.print(`[centralizedRamAttackManager] WARNING: target with missing name: ${target})`);
                    continue;
                }

                // Check if an attacker for this target already exists
                const already = attackers.find(a => a.target === target);
                if(already) 
                {
                    //ns.print(`[centralizedRamAttackManager] INFO: Attacker for target ${target} already exists. Skipping creation.`);
                    continue;
                }

                //ns.print(`[centralizedRamAttackManager] INFO: Creating new attacker for target ${target}.`);

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
                    beforeSnapshot: null,
                    afterSnapshot: null,
                    lastReport: ""
                };
                attackers.push(newAttacker);
            }
        }

        // Clear the pending action list
        attackersRequiringAction = [];

        // Go through the list of attackers and manage them
        for (const attacker of attackers) 
        {
            // If attacker is running, check if wakeup time has passed
            if (attacker.status === 'running' && attacker.wakeupTime <= Date.now()) 
            {
                //ns.print(`[centralizedRamAttackManager] INFO: Attacker for target ${attacker.target} has completed action ${attacker.currentMode}. Processing results.`);
                attacker.afterSnapshot = takeServerSnapshot(ns, attacker.target);
                if (attacker.beforeSnapshot && attacker.afterSnapshot) 
                {
                    attacker.lastReport = generateActionReport(
                        attacker.beforeSnapshot,
                        attacker.afterSnapshot,
                        attacker.currentMode,
                        attacker.requiredThreads,
                        host // or whatever you want as the source
                    );
                    //ns.print(attacker.lastReport); // or store/log as needed

                    // Clear snapshots
                    attacker.beforeSnapshot = null;
                    attacker.afterSnapshot = null;
                }

                // Reset to defaults so this attacker unit can be processed again
                resetAttacker(attacker);

                attackersRequiringAction.push(attacker);
            }
            else if (attacker.status === 'pending')
            {
                //ns.print(`[centralizedRamAttackManager] INFO: Attacker for target ${attacker.target} is pending action. Adding to action list.`);
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
            // // Defensive: Ensure attacker.target is a valid string
            // if (!attacker.target || typeof attacker.target !== 'string') {
            //     ns.print(`[centralizedRamAttackManager] ERROR: attacker.target is invalid: ${attacker.target}`);
            //     resetAttacker(attacker);
            //     continue;
            // }
            if(attacker.currentMode !== 'init')
            {
                //ns.print(`[centralizedRamAttackManager] INFO: Attacker unit for target ${attacker.target} already has mode decided as: ${attacker.currentMode}. Waiting for RAM to attack.`);
                continue;
            }

            // Use the decideServerAction function to determine next action
            const action = decideServerAction(ns, attacker.target, host);

            // Based on action, calculate required threads and RAM
            let requiredThreads = 0;
            let goal = 0;

           //ns.print(`[centralizedRamAttackManager] INFO: Decided action for target ${attacker.target} is ${action}.`);

            if (action === 'weaken')
            {
                attacker.activeScript = weakenScript;
                attacker.currentMode = 'weaken';

                // Goal is to reduce to min security
                goal = ns.getServerMinSecurityLevel(attacker.target);
                requiredThreads = getNumThreadsToReachGoal(ns, attacker.activeScript, goal, attacker.target, host); 
            }   
            else if (action === 'grow')
            {
                attacker.activeScript = growScript;
                attacker.currentMode = 'grow';

                // Goal is to grow to max money
                goal = ns.getServerMaxMoney(attacker.target);                
                requiredThreads = getNumThreadsToReachGoal(ns, attacker.activeScript, goal, attacker.target, host);
                
            }
            else if (action === 'hack')
            {
                attacker.activeScript = hackScript;
                attacker.currentMode = 'hack';

                // Goal is to hack down to 75% money
                goal = ns.getServerMoneyAvailable(attacker.target) - (ns.getServerMaxMoney(attacker.target) * 0.75);                
                requiredThreads = getNumThreadsToReachGoal(ns, attacker.activeScript, goal, attacker.target, host);                
            }
            else
            {
                // No action needed
                resetAttacker(attacker);
                continue;
            }

            attacker.requiredThreads = requiredThreads;

            // Print a statement showing required threads and the attacker's active script:
            //ns.print(`[centralizedRamAttackManager] INFO: Attacker for target ${attacker.target} requires ${requiredThreads} threads to perform ${action} using script ${attacker.activeScript}.`);

            // Determine the RAM required
            const scriptRam = ns.getScriptRam(attacker.activeScript, host);
            attacker.requiredRam = requiredThreads * scriptRam;

            // Determine priority score using botnet scoring
            const idx = targetQueue.findIndex(t => t === attacker.target);
            if (idx !== -1) 
            {
                ns.print(`[centralizedRamAttackManager] INFO: Calculating priority score for target ${attacker.target} at index ${idx}.`);
                attacker.priorityScore = targetQueue.length - idx; // Higher score for higher priority
            }

            //ns.print(`[centralizedRamAttackManager] INFO: Attacker for target ${attacker.target} requires ${attacker.requiredThreads} threads (${ns.formatRam(attacker.requiredRam)}) to perform ${action}. Priority score: ${attacker.priorityScore}`);
        }

        // Sort attackers requiring action by priority score (higher first)
        attackersRequiringAction.sort((a, b) => b.priorityScore - a.priorityScore);

        // Try to launch as many attackers as possible based on available RAM
        for (const attacker of attackersRequiringAction)
        {
            //ns.print(`[centralizedRamAttackManager] INFO: Attempting to launch attacker for target ${attacker.target} requiring ${attacker.requiredThreads} threads (${ns.formatRam(attacker.requiredRam)}) for action ${attacker.currentMode}.`);
            // Filter out non-pending attackers
            if (attacker.status !== 'pending')
            {
                //ns.print(`[centralizedRamAttackManager] INFO: Attacker for target ${attacker.target} is not pending (status: ${attacker.status}). Skipping launch.`);
                continue;
            } 

            // Update the free RAM
            freeRam = maxRam - ns.getServerUsedRam(host);

            if (attacker.requiredRam <= freeRam && attacker.requiredThreads > 0)
            {
                //ns.print(`[centralizedRamAttackManager] INFO: Launching attack on target ${attacker.target} with action ${attacker.currentMode} using ${attacker.requiredThreads} threads.`);
                attacker.beforeSnapshot = takeServerSnapshot(ns, attacker.target);

                // Launch the attack
                const pid = ns.exec(
                    attacker.activeScript,
                    host,
                    attacker.requiredThreads,
                    attacker.target
                );

                attacker.pid = pid;
                attacker.status = 'running';
                attacker.wakeupTime = Date.now() + 
                    (attacker.currentMode === 'weaken' ? ns.getWeakenTime(attacker.target) :
                    attacker.currentMode === 'grow' ? ns.getGrowTime(attacker.target) :
                    ns.getHackTime(attacker.target)) + 150;
                

                const formattedTime = formatSleepTime(attacker.wakeupTime - Date.now());
                //ns.print(`[centralizedRamAttackManager] INFO: ${attacker.currentMode} attack launched on target ${attacker.target} using ${attacker.requiredThreads} threads and will wake up in: ${formattedTime}.`);
                
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
                        attacker.beforeSnapshot = takeServerSnapshot(ns, attacker.target);
                        
                        // Launch the attack with reduced threads
                        const pid = ns.exec(
                            attacker.activeScript,
                            host,
                            maxThreadsPossible,
                            attacker.target
                        );
                        attacker.pid = pid;
                        attacker.requiredThreads = maxThreadsPossible;
                        attacker.requiredRam = maxThreadsPossible * scriptRam;
                        attacker.status = 'running';
                        attacker.wakeupTime = Date.now() + 
                            (attacker.currentMode === 'weaken' ? ns.getWeakenTime(attacker.target) :
                            attacker.currentMode === 'grow' ? ns.getGrowTime(attacker.target) :
                            ns.getHackTime(attacker.target)) + 150;
                         
                        const formattedTime = formatSleepTime(attacker.wakeupTime - Date.now());
                        //ns.print(`[centralizedRamAttackManager] Launched ${attacker.currentMode} attack on ${attacker.target} with REDUCED ${maxThreadsPossible} threads (PID: ${pid}) and will wake up in: ${formattedTime}.`);
                        
                    }
                }
                else
                {
                    // Not enough RAM to launch - also means we can't launch any more attackers this cycle.
                    //ns.print(`[centralizedRamAttackManager] WARNING: Not enough RAM to launch attack on ${attacker.target} (need ${ns.formatRam(attacker.requiredRam)}, have ${ns.formatRam(freeRam)})`);
                    
                    // Break to return to the main loop to sleep and check again next cycle
                    break;
                }
            }
        }

        const running = ns.ps(host);

        // // Optionally, clean up attackers array for finished jobs
        for (const attacker of attackers) 
        {
            if (attacker.status === 'running' && !running.find(s => s.pid === attacker.pid)) 
            {
                //ns.print(`[centralizedRamAttackManager] INFO: Attacker for target ${attacker.target} with PID ${attacker.pid} has finished. Resetting attacker.`);
                resetAttacker(attacker);
            }
        }

        

        await ns.sleep(1000); // Main loop delay

        loopCounter++;
    }
}
