import { toVercel } from '../server/http.js';
import { metaHandler } from '../server/handlers.js';

export default toVercel(metaHandler);
