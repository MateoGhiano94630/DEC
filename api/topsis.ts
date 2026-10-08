import { toVercel } from '../server/http.js';
import { topsisHandler } from '../server/handlers.js';

export default toVercel(topsisHandler);
