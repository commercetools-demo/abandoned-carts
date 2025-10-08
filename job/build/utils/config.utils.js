"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readConfiguration = void 0;
/**
 * Read the configuration env vars
 * Simplified for HTTP-only job that calls external service
 *
 * @returns The configuration with the correct env vars
 */
const readConfiguration = () => {
    const envVars = {
        abandonedCartServiceUrl: process.env.ABANDONED_CART_SERVICE_URL,
    };
    if (!envVars.abandonedCartServiceUrl) {
        throw new Error('ABANDONED_CART_SERVICE_URL environment variable is required');
    }
    return envVars;
};
exports.readConfiguration = readConfiguration;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLnV0aWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL2NvbmZpZy51dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQTs7Ozs7R0FLRztBQUNJLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxFQUFFO0lBQ3BDLE1BQU0sT0FBTyxHQUFHO1FBQ2QsdUJBQXVCLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEI7S0FDaEUsQ0FBQztJQUVGLElBQUksQ0FBQyxPQUFPLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUNyQyxNQUFNLElBQUksS0FBSyxDQUFDLDZEQUE2RCxDQUFDLENBQUM7SUFDakYsQ0FBQztJQUVELE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUMsQ0FBQztBQVZXLFFBQUEsaUJBQWlCLHFCQVU1QiJ9