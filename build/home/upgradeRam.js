// servers/home/upgradeRam.js
async function main(ns) {
  const serverToBeUpgraded = ns.getServer();
  const amountOfRamToPurchase = 8192;
  ns.upgradePurchasedServer(serverToBeUpgraded.hostname, amountOfRamToPurchase);
}
export {
  main
};
