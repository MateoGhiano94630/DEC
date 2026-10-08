import { toVercel } from '../server/http.js';
import { sensitivityHandler } from '../server/handlers.js';

export default toVercel(sensitivityHandler);
