import { inject, injectable } from "tsyringe";

import { ILogger } from "@spt/models/spt/utils/ILogger";
import { RagfairSellHelper } from "@spt/helpers/RagfairSellHelper";
import { ISellResult } from "@spt/models/eft/ragfair/IRagfairOffer";
import { ConfigServer } from "@spt/servers/ConfigServer";
import { DatabaseService } from "@spt/services/DatabaseService";
import { RandomUtil } from "@spt/utils/RandomUtil";
import { TimeUtil } from "@spt/utils/TimeUtil";
import { ModConfig } from "./ModConfig";

@injectable()
export class CustomRagfairSellHelper extends RagfairSellHelper
{
    constructor(
        @inject("PrimaryLogger") protected logger: ILogger,
        @inject("RandomUtil") protected randomUtil: RandomUtil,
        @inject("TimeUtil") protected timeUtil: TimeUtil,
        @inject("DatabaseService") protected databaseService: DatabaseService,
        @inject("ConfigServer") protected configServer: ConfigServer
    )
    {
        super(logger, randomUtil, timeUtil, databaseService, configServer);
    }

    public override rollForSale(sellChancePercent: number, itemSellCount: number, sellInOneGo = false): ISellResult[] 
    {
        const startTime = this.timeUtil.getTimestamp();

        // Get a time in future to stop simulating sell chances at
        const endTime =
            startTime +
            this.timeUtil.getHoursAsSeconds(this.databaseService.getGlobals().config.RagFair.offerDurationTimeInHour);

        let sellTime = startTime;
        let remainingCount = itemSellCount;
        const result: ISellResult[] = [];

        // Value can sometimes be NaN for whatever reason, default to base chance if that happens
        const effectiveSellChance = Number.isNaN(sellChancePercent)
            ? this.ragfairConfig.sell.chance.base
            : sellChancePercent;
        if (Number.isNaN(sellChancePercent)) 
        {
            this.logger.warning(
                `Sell chance was not a number: ${sellChancePercent}, defaulting to ${this.ragfairConfig.sell.chance.base}%`
            );
        }

        this.logger.debug(`Rolling to sell: ${itemSellCount} items (chance: ${effectiveSellChance}%)`);

        // No point rolling for a sale on a 0% chance item, exit early
        if (effectiveSellChance === 0) 
        {
            return result;
        }

        while (remainingCount > 0 && sellTime < endTime) 
        {
            const boughtAmount = sellInOneGo ? remainingCount : this.randomUtil.getInt(1, remainingCount);
            if (this.randomUtil.getChance100(effectiveSellChance)) 
            {
                // Passed roll check, item will be sold
                // Weight time to sell towards selling faster based on how cheap the item sold
                const weighting = (100 - effectiveSellChance) / 100;
                let maximumTime = weighting * (this.ragfairConfig.sell.time.max * 60);
                const minimumTime = this.ragfairConfig.sell.time.min * 60;
                if (maximumTime < minimumTime) 
                {
                    maximumTime = minimumTime + 5;
                }
                // Sell time will be random between min/max
                let newSellTime = Math.floor(Math.random() * (maximumTime - minimumTime) + minimumTime);
                if (newSellTime === 0) 
                {
                    // Ensure all sales dont occur the same exact time
                    newSellTime += 1;
                }
                sellTime += newSellTime;

                if (!this.randomUtil.getChance100(ModConfig.config.chanceToInstantSell))
                {
                    if ((sellTime - startTime) < ModConfig.config.minimumDelay)
                    {
                        const delayedTime = this.randomUtil.getInt(ModConfig.config.minimumDelay, ModConfig.config.maximumDelay);
                        sellTime += delayedTime;
                    }
                }

                result.push({ sellTime: sellTime, amount: boughtAmount });

                this.logger.debug(
                    `Offer will sell at: ${new Date(sellTime * 1000).toLocaleTimeString("en-US")}, bought: ${boughtAmount}`
                );
            }
            else 
            {
                this.logger.debug(`Offer rolled not to sell, item count: ${boughtAmount}`);
            }

            remainingCount -= boughtAmount;
        }

        return result;
    }
}