/** @param {NS} ns */
export async function main(ns) {

  const target = ns.args[0];

  const moneyStartValue = ns.getServerMoneyAvailable(target);

  const moneyGoal = (ns.getServerMaxMoney(target) - moneyStartValue / 2);

  ns.tprintf( "Number of threads required for 2x growth: %d", ns.growthAnalyze(target, 2));

  // This loop continues until the current amount of money available is greater than or equal
  // to the original amount of money, plus the money goal value.
  while(ns.getServerMoneyAvailable(target) <= (moneyStartValue + moneyGoal))
  {    
    //await ns.grow();
    ns.exit();
  }

}