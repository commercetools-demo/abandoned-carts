"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.post = void 0;
const custom_error_1 = __importDefault(require("../errors/custom.error"));
const logger_utils_1 = require("../utils/logger.utils");
/**
 * Exposed job endpoint.
 * Calls the abandoned cart service to process abandoned carts.
 *
 * @param {Request} _request The express request
 * @param {Response} response The express response
 * @returns
 */
const post = (_request, response) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        logger_utils_1.logger.info('Job triggered: Processing abandoned carts...');
        // Get the abandoned cart service URL from environment variables
        const serviceUrl = process.env.ABANDONED_CART_SERVICE_URL;
        if (!serviceUrl) {
            throw new Error('ABANDONED_CART_SERVICE_URL environment variable is required');
        }
        const endpoint = '/abandoned-cart/process';
        const url = `${serviceUrl}${endpoint}`;
        logger_utils_1.logger.info(`Calling abandoned cart service: ${url}`);
        // Call the abandoned cart service
        const serviceResponse = yield fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
        });
        if (!serviceResponse.ok) {
            const errorText = yield serviceResponse.text();
            throw new Error(`Service call failed: ${serviceResponse.status} ${errorText}`);
        }
        const result = yield serviceResponse.json();
        logger_utils_1.logger.info('Abandoned cart service response:', result);
        response.status(200).json({
            success: true,
            message: 'Job completed successfully',
            serviceResult: result,
        });
    }
    catch (error) {
        logger_utils_1.logger.error('Job failed:', error);
        throw new custom_error_1.default(500, `Job failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
exports.post = post;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiam9iLmNvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvam9iLmNvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBRUEsMEVBQWlEO0FBQ2pELHdEQUErQztBQUUvQzs7Ozs7OztHQU9HO0FBQ0ksTUFBTSxJQUFJLEdBQUcsQ0FBTyxRQUFpQixFQUFFLFFBQWtCLEVBQUUsRUFBRTtJQUNsRSxJQUFJLENBQUM7UUFDSCxxQkFBTSxDQUFDLElBQUksQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDO1FBRTVELGdFQUFnRTtRQUNoRSxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDO1FBQzFELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLDZEQUE2RCxDQUFDLENBQUM7UUFDakYsQ0FBQztRQUNELE1BQU0sUUFBUSxHQUFHLHlCQUF5QixDQUFDO1FBQzNDLE1BQU0sR0FBRyxHQUFHLEdBQUcsVUFBVSxHQUFHLFFBQVEsRUFBRSxDQUFDO1FBRXZDLHFCQUFNLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBRXRELGtDQUFrQztRQUNsQyxNQUFNLGVBQWUsR0FBRyxNQUFNLEtBQUssQ0FBQyxHQUFHLEVBQUU7WUFDdkMsTUFBTSxFQUFFLE1BQU07WUFDZCxPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjthQUNuQztZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztTQUN6QixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZUFBZSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3hCLE1BQU0sU0FBUyxHQUFHLE1BQU0sZUFBZSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQy9DLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLGVBQWUsQ0FBQyxNQUFNLElBQUksU0FBUyxFQUFFLENBQUMsQ0FBQztRQUNqRixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxlQUFlLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDNUMscUJBQU0sQ0FBQyxJQUFJLENBQUMsa0NBQWtDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFeEQsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDeEIsT0FBTyxFQUFFLElBQUk7WUFDYixPQUFPLEVBQUUsNEJBQTRCO1lBQ3JDLGFBQWEsRUFBRSxNQUFNO1NBQ3RCLENBQUMsQ0FBQztJQUNMLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YscUJBQU0sQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ25DLE1BQU0sSUFBSSxzQkFBVyxDQUNuQixHQUFHLEVBQ0gsZUFBZSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FDMUUsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQTNDVyxRQUFBLElBQUksUUEyQ2YifQ==