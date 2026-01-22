import { scanForAllServers } from "./myFunctions.js";
export async function main(ns) {

    let allServers = scanForAllServers(ns);

    let maxGrowTimeRecorded = 0;
    let serverWithMaxGrowTime = "";

    let maxHackTimeRecorded = 0;
    let serverWithMaxHackTime = "";

    let maxWeakenTimeRecorded = 0;
    let serverWithMaxWeakenTime = "";

    let weakenToGrowTimeFactor = 0;
    let weakenToHackTimeFactor = 0;
    let hackToGrowTimeFactor = 0;

    let timeFactors = [];
    let maxTimeFactors = 
    {
        serverName: "",
        weakToGrowFactor: 0,
        weakToHackFactor: 0,
        hackToGrowFactor: 0
    };

    for(let server of allServers) 
    {
        let serverName = server.name;
        let growTime = ns.getGrowTime(serverName);
        let hackTime = ns.getHackTime(serverName);
        let weakenTime = ns.getWeakenTime(serverName);

        if (growTime > maxGrowTimeRecorded) {
            maxGrowTimeRecorded = growTime;
            serverWithMaxGrowTime = serverName;
        }

        if (hackTime > maxHackTimeRecorded) {
            maxHackTimeRecorded = hackTime;
            serverWithMaxHackTime = serverName;
        }

        if (weakenTime > maxWeakenTimeRecorded) {
            maxWeakenTimeRecorded = weakenTime;
            serverWithMaxWeakenTime = serverName;
        }


        weakenToGrowTimeFactor = (weakenTime / growTime) * 100;
        weakenToHackTimeFactor = (weakenTime / hackTime) * 100;
        hackToGrowTimeFactor = (hackTime / growTime) * 100;

        let times = 
        {
            serverName: server.name,
            weakToGrowFactor: weakenToGrowTimeFactor,
            weakToHackFactor: weakenToHackTimeFactor,
            hackToGrowFactor: hackToGrowTimeFactor
        };

        timeFactors.push(times);

        if (weakenToGrowTimeFactor > maxTimeFactors.weakToGrowFactor) {
            maxTimeFactors.serverName = server.name;
            maxTimeFactors.weakToGrowFactor = weakenToGrowTimeFactor;
        }

        if (weakenToHackTimeFactor > maxTimeFactors.weakToHackFactor) {
            maxTimeFactors.serverName = server.name;
            maxTimeFactors.weakToHackFactor = weakenToHackTimeFactor;
        }    
        
        if (hackToGrowTimeFactor > maxTimeFactors.hackToGrowFactor) {
            maxTimeFactors.serverName = server.name;
            maxTimeFactors.hackToGrowFactor = hackToGrowTimeFactor;
        }
    }


    ns.tprintf("\n");
    
    ns.tprintf("INFO: Server with longest grow time: %s (%s)", serverWithMaxGrowTime, ns.tFormat(maxGrowTimeRecorded));
    ns.tprintf("INFO: Server with longest hack time: %s (%s)", serverWithMaxHackTime, ns.tFormat(maxHackTimeRecorded));
    ns.tprintf("INFO: Server with longest weaken time: %s (%s)", serverWithMaxWeakenTime, ns.tFormat(maxWeakenTimeRecorded));

    // Show the times from the timeFactors array
    ns.tprintf("\n");
    ns.tprintf("INFO: Max Weaken to Grow and Hack Time Factors:");
    ns.tprintf(" Server: %s | Weaken to Grow Time Factor: %.2f%% | Weaken to Hack Time Factor: %.2f%% | Hack to Grow Time Factor: %.2f%%", maxTimeFactors.serverName, maxTimeFactors.weakToGrowFactor, maxTimeFactors.weakToHackFactor, maxTimeFactors.hackToGrowFactor);


    ns.exit();

}