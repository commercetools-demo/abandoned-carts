import { HANDLER_TYPE_ABANDONED_CART } from '../constants/handler-type.constants.js';
import AbandonedCartHandler from '../handlers/abandoned-cart.handler.js';

class HandlerFactory {
  constructor() {}
  getHandler(handlerType) {
    if (HANDLER_TYPE_ABANDONED_CART === handlerType) {
      return new AbandonedCartHandler();
    }
    return null;
  }
}
export default HandlerFactory;
