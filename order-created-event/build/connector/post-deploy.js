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
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const create_client_1 = require("../client/create.client");
const assert_utils_1 = require("../utils/assert.utils");
const actions_1 = require("./actions");
const CONNECT_GCP_TOPIC_NAME_KEY = 'CONNECT_GCP_TOPIC_NAME';
const CONNECT_GCP_PROJECT_ID_KEY = 'CONNECT_GCP_PROJECT_ID';
const CONNECT_PROVIDER_KEY = 'CONNECT_PROVIDER';
const CONNECT_AZURE_CONNECTION_STRING_KEY = 'CONNECT_AZURE_CONNECTION_STRING';
function postDeploy(properties) {
    return __awaiter(this, void 0, void 0, function* () {
        const connectProvider = properties.get(CONNECT_PROVIDER_KEY);
        (0, assert_utils_1.assertString)(connectProvider, CONNECT_PROVIDER_KEY);
        const apiRoot = (0, create_client_1.createApiRoot)();
        switch (connectProvider) {
            case 'AZURE': {
                const connectionString = properties.get(CONNECT_AZURE_CONNECTION_STRING_KEY);
                (0, assert_utils_1.assertString)(connectionString, CONNECT_AZURE_CONNECTION_STRING_KEY);
                yield (0, actions_1.createAzureServiceBusCustomerCreateSubscription)(apiRoot, connectionString);
                break;
            }
            default: {
                const topicName = properties.get(CONNECT_GCP_TOPIC_NAME_KEY);
                const projectId = properties.get(CONNECT_GCP_PROJECT_ID_KEY);
                (0, assert_utils_1.assertString)(topicName, CONNECT_GCP_TOPIC_NAME_KEY);
                (0, assert_utils_1.assertString)(projectId, CONNECT_GCP_PROJECT_ID_KEY);
                yield (0, actions_1.createGcpPubSubCustomerCreateSubscription)(apiRoot, topicName, projectId);
            }
        }
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const properties = new Map(Object.entries(process.env));
            yield postDeploy(properties);
        }
        catch (error) {
            (0, assert_utils_1.assertError)(error);
            process.stderr.write(`Post-deploy failed: ${error.message}\n`);
            process.exitCode = 1;
        }
    });
}
run();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9zdC1kZXBsb3kuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29ubmVjdG9yL3Bvc3QtZGVwbG95LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0RBQTRCO0FBQzVCLGdCQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7QUFFaEIsMkRBQXdEO0FBQ3hELHdEQUFrRTtBQUNsRSx1Q0FHbUI7QUFFbkIsTUFBTSwwQkFBMEIsR0FBRyx3QkFBd0IsQ0FBQztBQUM1RCxNQUFNLDBCQUEwQixHQUFHLHdCQUF3QixDQUFDO0FBQzVELE1BQU0sb0JBQW9CLEdBQUcsa0JBQWtCLENBQUM7QUFDaEQsTUFBTSxtQ0FBbUMsR0FBRyxpQ0FBaUMsQ0FBQztBQUU5RSxTQUFlLFVBQVUsQ0FBQyxVQUFnQzs7UUFDeEQsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQzdELElBQUEsMkJBQVksRUFBQyxlQUFlLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUNwRCxNQUFNLE9BQU8sR0FBRyxJQUFBLDZCQUFhLEdBQUUsQ0FBQztRQUVoQyxRQUFRLGVBQWUsRUFBRSxDQUFDO1lBQ3hCLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDYixNQUFNLGdCQUFnQixHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQ3JDLG1DQUFtQyxDQUNwQyxDQUFDO2dCQUNGLElBQUEsMkJBQVksRUFBQyxnQkFBZ0IsRUFBRSxtQ0FBbUMsQ0FBQyxDQUFDO2dCQUNwRSxNQUFNLElBQUEseURBQStDLEVBQ25ELE9BQU8sRUFDUCxnQkFBZ0IsQ0FDakIsQ0FBQztnQkFDRixNQUFNO1lBQ1IsQ0FBQztZQUNELE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ1IsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO2dCQUM3RCxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUM7Z0JBQzdELElBQUEsMkJBQVksRUFBQyxTQUFTLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztnQkFDcEQsSUFBQSwyQkFBWSxFQUFDLFNBQVMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO2dCQUNwRCxNQUFNLElBQUEsbURBQXlDLEVBQzdDLE9BQU8sRUFDUCxTQUFTLEVBQ1QsU0FBUyxDQUNWLENBQUM7WUFDSixDQUFDO1FBQ0gsQ0FBQztJQUNILENBQUM7Q0FBQTtBQUVELFNBQWUsR0FBRzs7UUFDaEIsSUFBSSxDQUFDO1lBQ0gsTUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUN4RCxNQUFNLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUMvQixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLElBQUEsMEJBQVcsRUFBQyxLQUFLLENBQUMsQ0FBQztZQUNuQixPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsS0FBSyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUM7WUFDL0QsT0FBTyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUM7UUFDdkIsQ0FBQztJQUNILENBQUM7Q0FBQTtBQUVELEdBQUcsRUFBRSxDQUFDIn0=