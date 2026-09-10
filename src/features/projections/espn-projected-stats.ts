export type ProjectedStatLine = Record<string,number>;

export function scoreEspnProjectedStats(stats:ProjectedStatLine, scoring:Record<string,number>):number {
  const s=(key:string)=>scoring[key]??0, n=(key:string)=>stats[key]??0;
  let points=n("passingYards")/10*s("passingYard")+n("passingTouchdowns")*s("passingTd")+n("passingInterceptions")*s("interceptionThrown")+n("passingTwoPointConversions")*s("passingTwoPoint")
    +n("rushingYards")/10*s("rushingYard")+n("rushingTouchdowns")*s("rushingTd")+n("rushingTwoPointConversions")*s("rushingTwoPoint")
    +n("receivingYards")/10*s("receivingYard")+n("receptions")/5*s("reception")+n("receivingTouchdowns")*s("receivingTd")+n("receivingTwoPointConversions")*s("receivingTwoPoint")
    +n("extraPointsMade")*s("patMade")+n("fieldGoalsMissed")*s("fieldGoalMissed")
    +n("fieldGoalsMade0To39")*s("fieldGoalMade0To39")+n("fieldGoalsMade40To49")*s("fieldGoalMade40To49")+n("fieldGoalsMade50To59")*s("fieldGoalMade50To59")+n("fieldGoalsMade60Plus")*s("fieldGoalMade60Plus")
    +n("dstSacks")*s("dstSack")+n("dstInterceptions")*s("dstInterception")+n("dstFumbleRecoveries")*s("dstFumbleRecovery")+n("dstSafeties")*s("dstSafety")+n("dstBlockedKicks")*s("dstBlock")+n("dstReturnTouchdowns")*s("dstKickoffReturnTd")+n("dstDefensiveTouchdowns")*s("dstInterceptionReturnTd");
  points+=n("passing40PlusTouchdowns")*s("passing40TdBonus")+n("passing50PlusTouchdowns")*s("passing50TdBonus")+n("rushing40PlusTouchdowns")*s("rushing40TdBonus")+n("rushing50PlusTouchdowns")*s("rushing50TdBonus")+n("receiving40PlusTouchdowns")*s("receiving40TdBonus")+n("receiving50PlusTouchdowns")*s("receiving50TdBonus");
  const pass=n("passingYards"),rush=n("rushingYards"),rec=n("receivingYards"),pa=n("dstPointsAllowed"),ya=n("dstYardsAllowed");
  if(pass>=400)points+=s("passing400Plus");else if(pass>=300)points+=s("passing300To399");
  if(rush>=200)points+=s("rushing200Plus");else if(rush>=100)points+=s("rushing100To199");
  if(rec>=200)points+=s("receiving200Plus");else if(rec>=100)points+=s("receiving100To199");
  if(stats.dstPointsAllowed!==undefined){if(pa===0)points+=s("dstPa0");else if(pa<=6)points+=s("dstPa1To6");else if(pa<=13)points+=s("dstPa7To13");else if(pa<=17)points+=s("dstPa14To17");else if(pa>=46)points+=s("dstPa46Plus");else if(pa>=35)points+=s("dstPa35To45");else if(pa>=28)points+=s("dstPa28To34");}
  if(stats.dstYardsAllowed!==undefined){if(ya<100)points+=s("dstYaUnder100");else if(ya<200)points+=s("dstYa100To199");else if(ya>=450&&ya<500)points+=s("dstYa450To499");else if(ya>=400)points+=s("dstYa400To449");else if(ya>=350)points+=s("dstYa350To399");}
  return Number(points.toFixed(2));
}
