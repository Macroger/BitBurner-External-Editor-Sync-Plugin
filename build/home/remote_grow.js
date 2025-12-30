// servers/home/remote_grow.js
async function main(ns) {
  const target = ns.args[0];
  const moneyStartValue = ns.getServerMoneyAvailable(target);
  const moneyGoal = ns.getServerMaxMoney(target) - moneyStartValue / 2;
  ns.tprintf("Number of threads required for 2x growth: %d", ns.growthAnalyze(target, 2));
  while (ns.getServerMoneyAvailable(target) <= moneyStartValue + moneyGoal) {
    ns.exit();
  }
}
export {
  main
};
