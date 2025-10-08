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
const create_client_1 = require("../client/create.client");
const custom_error_1 = __importDefault(require("../errors/custom.error"));
const logger_utils_1 = require("../utils/logger.utils");
/**
 * Exposed event POST endpoint.
 * Receives the Pub/Sub message and updates abandoned cart custom object
 *
 * @param {Request} request The express request
 * @param {Response} response The express response
 * @returns
 */
const post = (request, response) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Check request body
    if (!request.body) {
        logger_utils_1.logger.error('Missing request body.');
        throw new custom_error_1.default(400, 'Bad request: No Pub/Sub message was received');
    }
    // Check if the body comes in a message
    if (!request.body.message) {
        logger_utils_1.logger.error('Missing body message');
        throw new custom_error_1.default(400, 'Bad request: Wrong Pub/Sub message format');
    }
    // Receive the Pub/Sub message
    const pubSubMessage = request.body.message;
    // Decode the message data
    const decodedData = pubSubMessage.data
        ? Buffer.from(pubSubMessage.data, 'base64').toString().trim()
        : undefined;
    if (!decodedData) {
        throw new custom_error_1.default(400, 'Bad request: No data in Pub/Sub message');
    }
    let orderCreatedMessage;
    try {
        orderCreatedMessage = JSON.parse(decodedData);
    }
    catch (error) {
        logger_utils_1.logger.error('Failed to parse Pub/Sub message data:', error);
        throw new custom_error_1.default(400, 'Bad request: Invalid JSON in Pub/Sub message');
    }
    // Validate message format
    if (orderCreatedMessage.notificationType !== 'Message' ||
        orderCreatedMessage.type !== 'OrderCreated' ||
        !orderCreatedMessage.order) {
        logger_utils_1.logger.info('Message is not an OrderCreated message, skipping:', {
            notificationType: orderCreatedMessage.notificationType,
            type: orderCreatedMessage.type
        });
        response.status(204).send();
        return;
    }
    const order = orderCreatedMessage.order;
    const cartId = (_a = order.cart) === null || _a === void 0 ? void 0 : _a.id;
    if (!cartId) {
        logger_utils_1.logger.warn('Order has no cart ID, skipping abandoned cart update:', order.id);
        response.status(204).send();
        return;
    }
    logger_utils_1.logger.info(`Processing OrderCreated event for order ${order.id} from cart ${cartId}`);
    try {
        // Look for abandoned cart custom object with the cart ID as key
        const customObjectResponse = yield (0, create_client_1.createApiRoot)()
            .customObjects()
            .withContainerAndKey({
            container: 'abandoned-carts',
            key: cartId,
        })
            .get()
            .execute();
        const customObject = customObjectResponse.body;
        // Update the custom object with conversion timestamp
        const updatedValue = Object.assign(Object.assign({}, customObject.value), { cartConvertedDate: order.createdAt });
        yield (0, create_client_1.createApiRoot)()
            .customObjects()
            .post({
            body: {
                container: 'abandoned-carts',
                key: cartId,
                version: customObject.version,
                value: updatedValue,
            },
        })
            .execute();
        logger_utils_1.logger.info(`Successfully updated abandoned cart custom object ${cartId} with conversion timestamp: ${order.createdAt}`);
    }
    catch (error) {
        if (error instanceof Error && 'statusCode' in error && error.statusCode === 404) {
            logger_utils_1.logger.info(`No abandoned cart custom object found for cart ${cartId}, skipping update`);
        }
        else {
            logger_utils_1.logger.error(`Failed to update abandoned cart custom object for cart ${cartId}:`, error);
            // Don't throw error - we don't want to fail the entire process if this update fails
        }
    }
    // Return success response
    response.status(204).send();
});
exports.post = post;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQuY29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb250cm9sbGVycy9ldmVudC5jb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUNBLDJEQUF3RDtBQUN4RCwwRUFBaUQ7QUFDakQsd0RBQStDO0FBRS9DOzs7Ozs7O0dBT0c7QUFDSSxNQUFNLElBQUksR0FBRyxDQUFPLE9BQWdCLEVBQUUsUUFBa0IsRUFBRSxFQUFFOztJQUNqRSxxQkFBcUI7SUFDckIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNsQixxQkFBTSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sSUFBSSxzQkFBVyxDQUFDLEdBQUcsRUFBRSw4Q0FBOEMsQ0FBQyxDQUFDO0lBQzdFLENBQUM7SUFFRCx1Q0FBdUM7SUFDdkMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDMUIscUJBQU0sQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUNyQyxNQUFNLElBQUksc0JBQVcsQ0FBQyxHQUFHLEVBQUUsMkNBQTJDLENBQUMsQ0FBQztJQUMxRSxDQUFDO0lBRUQsOEJBQThCO0lBQzlCLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBRTNDLDBCQUEwQjtJQUMxQixNQUFNLFdBQVcsR0FBRyxhQUFhLENBQUMsSUFBSTtRQUNwQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRTtRQUM3RCxDQUFDLENBQUMsU0FBUyxDQUFDO0lBRWQsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ2pCLE1BQU0sSUFBSSxzQkFBVyxDQUFDLEdBQUcsRUFBRSx5Q0FB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