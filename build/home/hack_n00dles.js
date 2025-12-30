// servers/home/hack_n00dles.js
async function main(ns) {
  const target = "n00dles";
  const moneyThreshold = 3e5;
  const securityThreshold = 1.6;
  let earnedMoney = 0;
  while (true) {
    if (ns.getServerSecurityLevel(target) > securityThreshold) {
      ns.tprintf("%s's security rating too high (%d), run weaking script!", target, ns.getServerSecurityLevel(target));
      ns.exit();
    } else if (ns.getServerMoneyAvailable(target) < moneyThreshold) {
      ns.tprintf("%s's money too low (%d), run growing script!", target, ns.getServerMoneyAvailable(target));
      ns.exit();
    } else {
      ns.printf("%s is ripe for hacking! Available cash: $%d. Earned so far: %d.  Initiating hack...", target, ns.getServerMoneyAvailable(target), earnedMoney);
      earnedMoney = await ns.hack(target);
      ns.printf("Amount earned this hack: %s", ns.formatNumber(earnedMoney));
    }
  }
}
export {
  main
};
