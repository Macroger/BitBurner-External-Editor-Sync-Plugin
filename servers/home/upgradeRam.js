/** @param {NS} ns */
export async function main(ns) {

  const serverToBeUpgraded = ns.getServer();
  const amountOfRamToPurchase = 8192;

  ns.upgradePurchasedServer(serverToBeUpgraded.hostname, amountOfRamToPurchase);

}