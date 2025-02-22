/* eslint-disable @typescript-eslint/naming-convention */
import { VFS } from "@spt/utils/VFS";
import { inject, injectable } from "tsyringe";
import { jsonc } from "jsonc";
import path from "path";
import { ILogger } from "@spt/models/spt/utils/ILogger";

@injectable()
export class ModConfig
{
    public static config: Config;

    constructor(
        @inject("PrimaryLogger") protected logger: ILogger,
        @inject("VFS") protected vfs: VFS
    )
    {
        ModConfig.config = jsonc.parse(this.vfs.readFile(path.resolve(__dirname, "../config/config.jsonc")));
    }

    public validateConfig(): void
    {
        if (ModConfig.config.minimumDelay >= ModConfig.config.maximumDelay)
        {
            ModConfig.config.maximumDelay = ModConfig.config.minimumDelay + 300;
        }

        if ((ModConfig.config.minimumDelay || ModConfig.config.maximumDelay) <= 0)
        {
            ModConfig.config.maximumDelay = 300;
            ModConfig.config.minimumDelay = 900;
        }

        if (ModConfig.config.chanceToInstantSell < 0 || ModConfig.config.chanceToInstantSell > 100)
        {
            ModConfig.config.chanceToInstantSell = 25;
        }
    }
}

export interface Config 
{
    minimumDelay: number,
    maximumDelay: number,
    chanceToInstantSell: number,
}