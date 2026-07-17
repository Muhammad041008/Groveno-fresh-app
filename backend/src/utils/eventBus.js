// Simple in-process pub/sub for SSE streams
const { EventEmitter } = require('events');

class Bus extends EventEmitter {}
const bus = new Bus();
bus.setMaxListeners(500);

// Event names
const EVENTS = {
  LOCATION_UPDATE: 'location_update',       // { orderId, lat, lng, distanceToHub, ts }
  ORDER_STATUS_CHANGED: 'order_status',     // { orderId, status, order }
  ORDER_CREATED: 'order_created',           // { order }
  PICKUP_ARRIVED: 'pickup_arrived',         // { orderId, order }
};

module.exports = { bus, EVENTS };
