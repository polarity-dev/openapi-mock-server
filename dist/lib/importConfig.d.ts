import { ExpressConfig } from "../types/expressConfig";
import { JsfConfig } from "../types/jsfConfig";
import { MockOverrides } from "../types/mockOverrides";
export declare type configType = {
    express: ExpressConfig;
    jsf: JsfConfig;
};
export declare const importConfigFile: ({ filePath }: {
    filePath?: string | undefined;
}) => Promise<configType | undefined>;
export declare const importOverridesFile: ({ filePath }: {
    filePath?: string | undefined;
}) => Promise<MockOverrides | undefined>;
