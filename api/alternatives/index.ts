import { toVercel } from '../../server/http.js';
import { alternativesHandler } from '../../server/handlers.js';

export default toVercel(alternativesHandler);
