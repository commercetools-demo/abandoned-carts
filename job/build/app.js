"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const express_1 = __importDefault(require("express"));
// Import routes
const job_route_1 = __importDefault(require("./routes/job.route"));
const error_middleware_1 = require("./middleware/error.middleware");
const custom_error_1 = __importDefault(require("./errors/custom.error"));
// Create the express app
const app = (0, express_1.default)();
app.disable('x-powered-by');
// Define routes
app.use('/job', job_route_1.default);
app.use('*', () => {
    throw new custom_error_1.default(404, 'Path not found.');
});
// Global error handler
app.use(error_middleware_1.errorMiddleware);
exports.default = app;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2FwcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtDQUFpQztBQUNqQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7QUFFaEIsc0RBQTJDO0FBRTNDLGdCQUFnQjtBQUNoQixtRUFBMkM7QUFFM0Msb0VBQWdFO0FBQ2hFLHlFQUFnRDtBQUVoRCx5QkFBeUI7QUFDekIsTUFBTSxHQUFHLEdBQVksSUFBQSxpQkFBTyxHQUFFLENBQUM7QUFDL0IsR0FBRyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUU1QixnQkFBZ0I7QUFDaEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsbUJBQVMsQ0FBQyxDQUFDO0FBQzNCLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRTtJQUNoQixNQUFNLElBQUksc0JBQVcsQ0FBQyxHQUFHLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztBQUNoRCxDQUFDLENBQUMsQ0FBQztBQUVILHVCQUF1QjtBQUN2QixHQUFHLENBQUMsR0FBRyxDQUFDLGtDQUFlLENBQUMsQ0FBQztBQUV6QixrQkFBZSxHQUFHLENBQUMifQ==