import { DeviceDependencies, DeviceIsConnectedToNetworkOptions, IDevice } from './definitions';
/**
 * @hidden
 */
export declare class Device implements IDevice {
    deps: DeviceDependencies;
    deviceType: string;
    /**
     * @private
     */
    private emitter;
    constructor(deps: DeviceDependencies);
    isAndroid(): boolean;
    isIOS(): boolean;
    isConnectedToNetwork(options?: DeviceIsConnectedToNetworkOptions): boolean;
    /**
     * @private
     */
    private registerEventHandlers();
    /**
     * @private
     */
    private determineDeviceType();
}
