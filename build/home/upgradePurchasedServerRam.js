// servers/home/upgradePurchasedServerRam.js
async function main(ns) {
  if (ns.args.length !== 1) {
    ns.tprintf("Usage: run upgradePurchasedServerRAM.js [serverName]");
    ns.tprintf("Example: run upgradePurchasedServerRAM.js pserv-0");
    return;
  }
  var server = ns.args[0];
  var currentRam = ns.getServerMaxRam(server);
  var nextRam = currentRam * 2;
  var maxRam = ns.getPurchasedServerMaxRam();
  if (nextRam > maxRam) {
    ns.tprintf("ERROR: %s is already at max RAM (%d GB).", server, maxRam);
    return;
  }
  var cost = ns.getPurchasedServerUpgradeCost(server, nextRam);
  var playerMoney = ns.getPlayer().money;
  if (playerMoney < cost) {
    ns.tprintf("ERROR: Not enough funds to upgrade %s to %d GB RAM. Required: $%s, Available: $%s", server, nextRam, ns.formatNumber(cost, 2), ns.formatNumber(playerMoney, 2));
    return;
  }
  var playerMoneyBefore = playerMoney;
  var success = ns.upgradePurchasedServer(server, nextRam);
  var playerMoneyAfter = ns.getPlayer().money;
  if (success) {
    var spent = playerMoneyBefore - playerMoneyAfter;
    ns.tprintf("SUCCESS: %s upgraded to %d GB RAM. Funds spent: $%s", server, nextRam, ns.formatNumber(spent, 2));
  } else {
    ns.tprintf("ERROR: Could not upgrade %s to %d GB RAM. Check funds and upgrade limits.", server, nextRam);
  }
}
export {
  main
};
