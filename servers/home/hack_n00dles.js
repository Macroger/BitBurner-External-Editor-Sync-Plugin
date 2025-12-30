/** @param {NS} ns */
export async function main(ns) {
    // Defines the "target server", which is the server
    // that we're going to hack. In this case, it's "n00dles"
    const target = "n00dles";   

    // Defines how much money a server should have before we hack it
    // In this case, it is set to the maximum amount of money.
    const moneyThreshold = 300000;

    // Defines the maximum security level the target server can
    // have. If the target's security level is higher than this,
    // we'll weaken it before doing anything else
    const securityThreshold = 1.6;

    let earnedMoney = 0;    

    // Infinite loop that continously hacks/grows/weakens the target server
    while(true) 
    {
        if (ns.getServerSecurityLevel(target) > securityThreshold) 
        {
          // If the server's security level is above our threshold, weaken it
          ns.tprintf("%s's security rating too high (%d), run weaking script!", target, ns.getServerSecurityLevel(target));
          ns.exit();
        } 
        else if (ns.getServerMoneyAvailable(target) < moneyThreshold) 
        {
          // If the server's money is less than our threshold, grow it
          ns.tprintf("%s's money too low (%d), run growing script!", target, ns.getServerMoneyAvailable(target));
          ns.exit();
        } 
        else
        {
          // Otherwise, hack it
          ns.printf("%s is ripe for hacking! Available cash: $%d. Earned so far: %d.  Initiating hack...", target, ns.getServerMoneyAvailable(target), earnedMoney);
          earnedMoney = await ns.hack(target);
          ns.printf("Amount earned this hack: %s", ns.formatNumber(earnedMoney));
        }
    }
}