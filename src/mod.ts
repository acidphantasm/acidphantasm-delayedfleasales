import { DependencyContainer, Lifecycle } from "tsyringe";

import { IPreSptLoadMod } from "@spt/models/external/IPreSptLoadMod";
import { CustomRagfairSellHelper } from "./CustomRagfairSellHelper";
import { ModConfig } from "./ModConfig";

class DelayedFleaSales implements IPreSptLoadMod
{
    private mod: string
    private modConfig: ModConfig

    constructor() 
    {
        this.mod = "acidphantasm-DelayedFleaSales";
    }

    public preSptLoad(container: DependencyContainer): void 
    {

        container.register<ModConfig>("ModConfig", ModConfig, { lifecycle: Lifecycle.Singleton })
        this.modConfig = container.resolve<ModConfig>("ModConfig");

        container.register<CustomRagfairSellHelper>("CustomRagfairSellHelper", CustomRagfairSellHelper);
        container.register("RagfairSellHelper", { useToken: "CustomRagfairSellHelper" });
    }
}

module.exports = { mod: new DelayedFleaSales() }
