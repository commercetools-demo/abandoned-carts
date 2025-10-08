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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGcpPubSubCustomerCreateSubscription = createGcpPubSubCustomerCreateSubscription;
exports.createAzureServiceBusCustomerCreateSubscription = createAzureServiceBusCustomerCreateSubscription;
exports.deleteCustomerCreateSubscription = deleteCustomerCreateSubscription;
const CUSTOMER_CREATE_SUBSCRIPTION_KEY = 'myconnector-customerCreateSubscription';
function createGcpPubSubCustomerCreateSubscription(apiRoot, topicName, projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        const destination = {
            type: 'GoogleCloudPubSub',
            topic: topicName,
            projectId,
        };
        yield createSubscription(apiRoot, destination);
    });
}
function createAzureServiceBusCustomerCreateSubscription(apiRoot, connectionString) {
    return __awaiter(this, void 0, void 0, function* () {
        const destination = {
            type: 'AzureServiceBus',
            connectionString: connectionString,
        };
        yield createSubscription(apiRoot, destination);
    });
}
function createSubscription(apiRoot, destination) {
    return __awaiter(this, void 0, void 0, function* () {
        yield deleteCustomerCreateSubscription(apiRoot);
        yield apiRoot
            .subscriptions()
            .post({
            body: {
                key: CUSTOMER_CREATE_SUBSCRIPTION_KEY,
                destination,
                messages: [
                    {
                        resourceTypeId: 'customer',
                        types: ['CustomerCreated'],
                    },
                ],
            },
        })
            .execute();
    });
}
function deleteCustomerCreateSubscription(apiRoot) {
    return __awaiter(this, void 0, void 0, function* () {
        const { body: { results: subscriptions }, } = yield apiRoot
            .subscriptions()
            .get({
            queryArgs: {
                where: `key = "${CUSTOMER_CREATE_SUBSCRIPTION_KEY}"`,
            },
        })
            .execute();
        if (subscriptions.length > 0) {
            const subscription = subscriptions[0];
            yield apiRoot
                .subscriptions()
                .withKey({ key: CUSTOMER_CREATE_SUBSCRIPTION_KEY })
                .delete({
                queryArgs: {
                    version: subscription.version,
                },
            })
                .execute();
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb25uZWN0b3IvYWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQVVBLDhGQVdDO0FBRUQsMEdBU0M7QUF3QkQsNEVBMkJDO0FBNUVELE1BQU0sZ0NBQWdDLEdBQ3BDLHdDQUF3QyxDQUFDO0FBRTNDLFNBQXNCLHlDQUF5QyxDQUM3RCxPQUFtQyxFQUNuQyxTQUFpQixFQUNqQixTQUFpQjs7UUFFakIsTUFBTSxXQUFXLEdBQWlDO1lBQ2hELElBQUksRUFBRSxtQkFBbUI7WUFDekIsS0FBSyxFQUFFLFNBQVM7WUFDaEIsU0FBUztTQUNWLENBQUM7UUFDRixNQUFNLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztJQUNqRCxDQUFDO0NBQUE7QUFFRCxTQUFzQiwrQ0FBK0MsQ0FDbkUsT0FBbUMsRUFDbkMsZ0JBQXdCOztRQUV4QixNQUFNLFdBQVcsR0FBK0I7WUFDOUMsSUFBSSxFQUFFLGlCQUFpQjtZQUN2QixnQkFBZ0IsRUFBRSxnQkFBZ0I7U0FDbkMsQ0FBQztRQUNGLE1BQU0sa0JBQWtCLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ2pELENBQUM7Q0FBQTtBQUVELFNBQWUsa0JBQWtCLENBQy9CLE9BQW1DLEVBQ25DLFdBQXdCOztRQUV4QixNQUFNLGdDQUFnQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2hELE1BQU0sT0FBTzthQUNWLGFBQWEsRUFBRTthQUNmLElBQUksQ0FBQztZQUNKLElBQUksRUFBRTtnQkFDSixHQUFHLEVBQUUsZ0NBQWdDO2dCQUNyQyxXQUFXO2dCQUNYLFFBQVEsRUFBRTtvQkFDUjt3QkFDRSxjQUFjLEVBQUUsVUFBVTt3QkFDMUIsS0FBSyxFQUFFLENBQUMsaUJBQWlCLENBQUM7cUJBQzNCO2lCQUNGO2FBQ0Y7U0FDRixDQUFDO2FBQ0QsT0FBTyxFQUFFLENBQUM7SUFDZixDQUFDO0NBQUE7QUFFRCxTQUFzQixnQ0FBZ0MsQ0FDcEQsT0FBbUM7O1FBRW5DLE1BQU0sRUFDSixJQUFJLEVBQUUsRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLEdBQ2pDLEdBQUcsTUFBTSxPQUFPO2FBQ2QsYUFBYSxFQUFFO2FBQ2YsR0FBRyxDQUFDO1lBQ0gsU0FBUyxFQUFFO2dCQUNULEtBQUssRUFBRSxVQUFVLGdDQUFnQyxHQUFHO2FBQ3JEO1NBQ0YsQ0FBQzthQUNELE9BQU8sRUFBRSxDQUFDO1FBRWIsSUFBSSxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzdCLE1BQU0sWUFBWSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUV0QyxNQUFNLE9BQU87aUJBQ1YsYUFBYSxFQUFFO2lCQUNmLE9BQU8sQ0FBQyxFQUFFLEdBQUcsRUFBRSxnQ0FBZ0MsRUFBRSxDQUFDO2lCQUNsRCxNQUFNLENBQUM7Z0JBQ04sU0FBUyxFQUFFO29CQUNULE9BQU8sRUFBRSxZQUFZLENBQUMsT0FBTztpQkFDOUI7YUFDRixDQUFDO2lCQUNELE9BQU8sRUFBRSxDQUFDO1FBQ2YsQ0FBQztJQUNILENBQUM7Q0FBQSJ9