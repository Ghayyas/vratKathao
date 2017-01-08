import { AppStatus, IAuth, IAuthModules, IClient, ICombinedTokenContext, IConfig, ICordova, ICore, IDeploy, IDevice, IEventEmitter, IInsights, ILogger, IPush, ISingleUserService, IStorageStrategy, IUserContext } from './definitions';
/**
 * @hidden
 */
export declare class Container {
    appStatus: AppStatus;
    config: IConfig;
    eventEmitter: IEventEmitter;
    logger: ILogger;
    localStorageStrategy: IStorageStrategy;
    sessionStorageStrategy: IStorageStrategy;
    authTokenContext: ICombinedTokenContext;
    client: IClient;
    insights: IInsights;
    core: ICore;
    device: IDevice;
    cordova: ICordova;
    userContext: IUserContext;
    singleUserService: ISingleUserService;
    authModules: IAuthModules;
    auth: IAuth;
    push: IPush;
    deploy: IDeploy;
}
