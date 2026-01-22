/** @param {NS} ns */
export async function main(ns) {
    // --- Exponential curve fit for cost estimation ---
    // Data points: [from GB, to GB, cost]
    const upgradeData = [
        {from: 8, to: 16, cost: 440000},
        {from: 16, to: 32, cost: 880000},
        {from: 32, to: 64, cost: 1760000},
        {from: 64, to: 128, cost: 3520000},
        {from: 128, to: 256, cost: 7040000},
        {from: 256, to: 512, cost: 14080000},
        {from: 512, to: 1024, cost: 28160000},
        {from: 1024, to: 2048, cost: 56320000},
        {from: 2048, to: 4096, cost: 112640000},
        {from: 4096, to: 8192, cost: 225280000},
        {from: 8192, to: 16384, cost: 450560000},
        {from: 16384, to: 32768, cost: 901120000}
    ];

    // Fit cost = a * (toGB)^b
    function fitExponential(data) {
        // Fits an exponential curve: cost = a * (toGB)^b
        // using least squares on log(cost) = log(a) + b*log(toGB)
        // Returns coefficients a and b for prediction.
        let sumLogGB = 0, sumLogCost = 0, sumLogGB2 = 0, sumLogGBLogCost = 0, n = data.length;
        for (const pt of data) {
            // Take natural log of RAM and cost for each data point
            const logGB = Math.log(pt.to);
            const logCost = Math.log(pt.cost);
            sumLogGB += logGB;
            sumLogCost += logCost;
            sumLogGB2 += logGB * logGB;
            sumLogGBLogCost += logGB * logCost;
        }
        // Calculate slope (b) and intercept (logA) for best fit line
        const b = (n * sumLogGBLogCost - sumLogGB * sumLogCost) / (n * sumLogGB2 - sumLogGB * sumLogGB);
        const logA = (sumLogCost - b * sumLogGB) / n;
        // Convert intercept back from log scale
        const a = Math.exp(logA);
        // Return coefficients for cost = a * (toGB)^b
        return {a, b};
    }

    const fit = fitExponential(upgradeData);
    function estimateStepCost(toGB) {
        return fit.a * Math.pow(toGB, fit.b);
    }
    
    if (ns.args.length === 0) {
        ns.tprintf("Usage: run upgradePurchasedServerRAM.js [serverName] [targetRam] [-y]");
        ns.tprintf("Examples:");
        ns.tprintf(" run upgradePurchasedServerRAM.js pserv-0");
        ns.tprintf(" run upgradePurchasedServerRAM.js pserv-0 128");
        ns.tprintf(" run upgradePurchasedServerRAM.js pserv-0 128 -y");
        return;
    }
    var server = ns.args[0];
    // Validate server name
    if (!server || server === "-y") 
    {
        ns.tprintf("ERROR: You must provide a valid server name as the first argument.");
        ns.tprintf("Usage: run upgradePurchasedServerRAM.js [serverName] [targetRam] [-y]");
        return;
    }
    
    // Check if server exists
    if (!ns.serverExists(server)) 
    {
        ns.tprintf("ERROR: Server '%s' does not exist.", server);
        return;
    }

    // Check if server is a purchased server
    if (!ns.getPurchasedServers().includes(server)) 
    {
        ns.tprintf("ERROR: Server '%s' is not a purchased server.", server);
        return;
    }

    // Get current and max RAM
    var currentRam = ns.getServerMaxRam(server);
    var maxRam = ns.getPurchasedServerMaxRam();

    let targetRam;
    let confirmFlagPresent = false;

    // If only server name is provided, show cost of next upgrade
    if (ns.args.length === 1) 
    {
        
        // Determine how much RAM to upgrade to (next power of 2)
        var nextRam = currentRam * 2;
        if (nextRam > maxRam) 
        {
            ns.tprintf("ERROR: %s is already at max RAM (%d GB).", server, maxRam);
            return;
        }

        // Show cost of next upgrade
        var cost = ns.getPurchasedServerUpgradeCost(server, nextRam);
        if (cost === -1) 
        {
            ns.tprintf("ERROR: Unable to calculate cost for upgrade to %d GB RAM. Check if the value is valid.", nextRam);
            return;
        }
        ns.tprintf("INFO: Cost to upgrade %s from %d GB to %d GB RAM: $%s", server, currentRam, nextRam, ns.formatNumber(cost, 2));
        ns.tprintf("Run with -y to confirm and perform the upgrade.");
        return;
    }
    else if (ns.args.length === 2) 
    {

        // Arg length is 2 - we need to determine if the second argument is the target RAM or the confirmation flag
        // Check if the second argument is the confirmation flag
        if (ns.args[1] === "-y") 
        {

            // The -y flag has been provided without a target RAM value,
            // set the target ram to the next power of 2 and perform the upgrade
            targetRam = currentRam * 2;
            confirmFlagPresent = true;
        }
        else
        {
            // The second argument is the target RAM value
            targetRam = parseInt(ns.args[1], 10);
        }
    }
    else if (ns.args.length === 3) 
    {
        // Arg length is 3 - that means this arg list should include Hostname, target RAM, and confirmation flag

        // Get the target RAM from the 2nd argument
        targetRam = parseInt(ns.args[1], 10);
        
        // Check to ensure the 3rd argument is the confirmation flag
        if( ns.args[2] === "-y" )
        {
             confirmFlagPresent = true;
        }
    }

    // Validate target RAM
    if (isNaN(targetRam) || targetRam <= currentRam) 
    {
        ns.tprintf("ERROR: Target RAM must be greater than current RAM (%d GB).", currentRam);
        return;
    }

    // If targetRam is not a power of 2, round up to the next power of 2 and warn the user
    function isPowerOf2(x) { return (x & (x - 1)) === 0; }
    
    let originalTargetRam = targetRam;
    
    // Check if target RAM is a power of 2
    if (!isPowerOf2(targetRam)) 
    {
        // Round up to next power of 2
        let nextPower = 1;
        while (nextPower < targetRam) nextPower *= 2;
        targetRam = nextPower;
        ns.tprintf("WARNING: Requested RAM (%d GB) is not a power of 2. Rounding up to %d GB.", originalTargetRam, targetRam);
    }

    // Check if the target RAM is greater than the max allowed RAM
    if (targetRam > maxRam) {
        ns.tprintf("ERROR: Target RAM exceeds max allowed (%d GB).", maxRam);
        return;
    }
    
    // Calculate total cost for all upgrades
    let curveTotalCost = 0;
    let stepRam = currentRam;
    let curveBreakdown = [];
    
    while (stepRam < targetRam) {
        let nextRam = stepRam * 2;
        let curveCost = Math.round(estimateStepCost(nextRam));
        curveBreakdown.push({from: stepRam, to: nextRam, cost: curveCost});
        curveTotalCost += curveCost;
        stepRam = nextRam;
    }
    
    // Check if the user has confirmed the upgrade, if not display the total cost and exit
    if (!confirmFlagPresent) 
    {
        ns.tprintf("INFO: Upgrade cost breakdown for %s:", server);
        for (const step of curveBreakdown) {
            ns.tprintf("  %d GB → %d GB: $%s", step.from, step.to, ns.formatNumber(step.cost, 2));
        }
        ns.tprintf("INFO: Total cost to upgrade %s from %d GB to %d GB RAM: $%s", server, currentRam, targetRam, ns.formatNumber(curveTotalCost, 2));
        ns.tprintf("Run with -y to confirm and perform the upgrade.");
        return;
    }

    // Get player's available money
    var playerMoney = ns.getPlayer().money;
    
    // Check if player has enough money    
    if (playerMoney < curveTotalCost) 
    {
        ns.tprintf("ERROR: Not enough funds to upgrade %s to %d GB RAM. Required: $%s, Available: $%s", server, targetRam, ns.formatNumber(curveTotalCost, 2), ns.formatNumber(playerMoney, 2));
        return;
    }

    // Record the player's money before upgrade
    var playerMoneyBefore = playerMoney;

    // Upgrade in steps
    let success = true;
    stepRam = currentRam;
    ns.tprintf("Upgrade steps for %s:", server);
    while (stepRam < targetRam && success) 
    {
        let nextRam = stepRam * 2;
        let curveCost = Math.round(estimateStepCost(nextRam));
        ns.tprintf("  %d GB → %d GB: $%s", stepRam, nextRam, ns.formatNumber(curveCost, 2));
        success = ns.upgradePurchasedServer(server, nextRam);
        stepRam = nextRam;
    }

    var playerMoneyAfter = ns.getPlayer().money;
    
    if (success && stepRam === targetRam) 
    {
        var spent = playerMoneyBefore - playerMoneyAfter;
        ns.tprintf("SUCCESS: %s upgraded to %d GB RAM. Funds spent: $%s", server, targetRam, ns.formatNumber(spent, 2));
    } 
    else 
    {
        ns.tprintf("ERROR: Could not upgrade %s to %d GB RAM. Check funds and upgrade limits.", server, targetRam);
    }
}