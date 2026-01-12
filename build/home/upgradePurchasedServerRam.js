// servers/home/upgradePurchasedServerRam.js
async function main(ns) {
  const upgradeData = [
    { from: 8, to: 16, cost: 44e4 },
    { from: 16, to: 32, cost: 88e4 },
    { from: 32, to: 64, cost: 176e4 },
    { from: 64, to: 128, cost: 352e4 },
    { from: 128, to: 256, cost: 704e4 },
    { from: 256, to: 512, cost: 1408e4 },
    { from: 512, to: 1024, cost: 2816e4 },
    { from: 1024, to: 2048, cost: 5632e4 },
    { from: 2048, to: 4096, cost: 11264e4 },
    { from: 4096, to: 8192, cost: 22528e4 },
    { from: 8192, to: 16384, cost: 45056e4 },
    { from: 16384, to: 32768, cost: 90112e4 }
  ];
  function fitExponential(data) {
    let sumLogGB = 0, sumLogCost = 0, sumLogGB2 = 0, sumLogGBLogCost = 0, n = data.length;
    for (const pt of data) {
      const logGB = Math.log(pt.to);
      const logCost = Math.log(pt.cost);
      sumLogGB += logGB;
      sumLogCost += logCost;
      sumLogGB2 += logGB * logGB;
      sumLogGBLogCost += logGB * logCost;
    }
    const b = (n * sumLogGBLogCost - sumLogGB * sumLogCost) / (n * sumLogGB2 - sumLogGB * sumLogGB);
    const logA = (sumLogCost - b * sumLogGB) / n;
    const a = Math.exp(logA);
    return { a, b };
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
  if (!server || server === "-y") {
    ns.tprintf("ERROR: You must provide a valid server name as the first argument.");
    ns.tprintf("Usage: run upgradePurchasedServerRAM.js [serverName] [targetRam] [-y]");
    return;
  }
  if (!ns.serverExists(server)) {
    ns.tprintf("ERROR: Server '%s' does not exist.", server);
    return;
  }
  if (!ns.getPurchasedServers().includes(server)) {
    ns.tprintf("ERROR: Server '%s' is not a purchased server.", server);
    return;
  }
  var currentRam = ns.getServerMaxRam(server);
  var maxRam = ns.getPurchasedServerMaxRam();
  if (ns.args.length === 1) {
    var nextRam = currentRam * 2;
    if (nextRam > maxRam) {
      ns.tprintf("ERROR: %s is already at max RAM (%d GB).", server, maxRam);
      return;
    }
    var cost = ns.getPurchasedServerUpgradeCost(server, nextRam);
    if (cost === -1) {
      ns.tprintf("ERROR: Unable to calculate cost for upgrade to %d GB RAM. Check if the value is valid.", nextRam);
      return;
    }
    ns.tprintf("INFO: Cost to upgrade %s from %d GB to %d GB RAM: $%s", server, currentRam, nextRam, ns.formatNumber(cost, 2));
    ns.tprintf("Run with -y to confirm and perform the upgrade.");
    return;
  }
  var targetRam = parseInt(ns.args[1], 10);
  var confirm = ns.args[2] === "-y";
  if (isNaN(targetRam) || targetRam <= currentRam) {
    ns.tprintf("ERROR: Target RAM must be greater than current RAM (%d GB).", currentRam);
    return;
  }
  function isPowerOf2(x) {
    return (x & x - 1) === 0;
  }
  let originalTargetRam = targetRam;
  if (!isPowerOf2(targetRam)) {
    let nextPower = 1;
    while (nextPower < targetRam) nextPower *= 2;
    targetRam = nextPower;
    ns.tprintf("WARNING: Requested RAM (%d GB) is not a power of 2. Rounding up to %d GB.", originalTargetRam, targetRam);
  }
  if (targetRam > maxRam) {
    ns.tprintf("ERROR: Target RAM exceeds max allowed (%d GB).", maxRam);
    return;
  }
  let curveTotalCost = 0;
  let stepRam = currentRam;
  let curveBreakdown = [];
  while (stepRam < targetRam) {
    let nextRam2 = stepRam * 2;
    let curveCost = Math.round(estimateStepCost(nextRam2));
    curveBreakdown.push({ from: stepRam, to: nextRam2, cost: curveCost });
    curveTotalCost += curveCost;
    stepRam = nextRam2;
  }
  if (!confirm) {
    ns.tprintf("INFO: Upgrade cost breakdown for %s:", server);
    for (const step of curveBreakdown) {
      ns.tprintf("  %d GB \u2192 %d GB: $%s", step.from, step.to, ns.formatNumber(step.cost, 2));
    }
    ns.tprintf("INFO: Total cost to upgrade %s from %d GB to %d GB RAM: $%s", server, currentRam, targetRam, ns.formatNumber(curveTotalCost, 2));
    ns.tprintf("Run with -y to confirm and perform the upgrade.");
    return;
  }
  var playerMoney = ns.getPlayer().money;
  if (playerMoney < curveTotalCost) {
    ns.tprintf("ERROR: Not enough funds to upgrade %s to %d GB RAM. Required: $%s, Available: $%s", server, targetRam, ns.formatNumber(curveTotalCost, 2), ns.formatNumber(playerMoney, 2));
    return;
  }
  var playerMoneyBefore = playerMoney;
  let success = true;
  stepRam = currentRam;
  ns.tprintf("Upgrade steps for %s:", server);
  while (stepRam < targetRam && success) {
    let nextRam2 = stepRam * 2;
    let curveCost = Math.round(estimateStepCost(nextRam2));
    ns.tprintf("  %d GB \u2192 %d GB: $%s", stepRam, nextRam2, ns.formatNumber(curveCost, 2));
    success = ns.upgradePurchasedServer(server, nextRam2);
    stepRam = nextRam2;
  }
  var playerMoneyAfter = ns.getPlayer().money;
  if (success && stepRam === targetRam) {
    var spent = playerMoneyBefore - playerMoneyAfter;
    ns.tprintf("SUCCESS: %s upgraded to %d GB RAM. Funds spent: $%s", server, targetRam, ns.formatNumber(spent, 2));
  } else {
    ns.tprintf("ERROR: Could not upgrade %s to %d GB RAM. Check funds and upgrade limits.", server, targetRam);
  }
}
export {
  main
};
