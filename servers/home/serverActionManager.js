/** @param {NS} ns */
import {launchScriptAttack} from "./myFunctions.js";
export async function main(ns) 
{
    const target = ns.args[0];

    let mode = "analyze"; // Start in analyze mode

    // Analyze server state
    let minSec = ns.getServerMinSecurityLevel(target);
    let curSec = ns.getServerSecurityLevel(target);
    let maxMoney = ns.getServerMaxMoney(target);
    let curMoney = ns.getServerMoneyAvailable(target);

    const minMoney = 0; // Minimum money on server

    const weakenThreshold = minSec * 1.05; // Threshold for when to begin weakening (5% above min)
    const growThreshold = maxMoney * 0.75; // Threshold for when to begin growing money (75% of maxMoney)
    const hackThreshold = maxMoney * 0.92; // Threshold for when to begin hacking money (92% of maxMoney)

    while (true) 
    {
        // Analyze server state
        minSec = ns.getServerMinSecurityLevel(target);
        curSec = ns.getServerSecurityLevel(target);
        maxMoney = ns.getServerMaxMoney(target);
        curMoney = ns.getServerMoneyAvailable(target);

        switch (mode) 
        {
            case "analyze":
                
                // Check server state and decide next mode

                if (curSec > weakenThreshold) 
                {
                    // The servers security is too high, we need to weaken it
                    mode = "weaken";                        
                }
                else if (curMoney < growThreshold) 
                {
                    // The server needs to grow more money
                    mode = "grow";                    
                }
                else if(curMoney >= hackThreshold)
                {
                    // The server is primed for hacking
                    mode = "hack";
                }

                continue;

            case "weaken":
                // Use launchScriptAttack to weaken to minSec
                launchScriptAttack(ns, "weaken.js", target, target, minSec, 0, false);
                mode = "analyze";
                await ns.sleep(ns.getWeakenTime(target));
                continue;

            case "grow":
                // Use launchScriptAttack to grow to maxMoney
                launchScriptAttack(ns, "grow.js", target, target, maxMoney, 0, false);
                mode = "analyze";
                await ns.sleep(ns.getGrowTime(target));
                continue;

            case "hack":
                // Use launchScriptAttack to hack down to minMoney
                launchScriptAttack(ns, "hack.js", target, target, minMoney, 0, false);
                mode = "analyze";
                await ns.sleep(ns.getHackTime(target));
                continue;
        }
    }
} 