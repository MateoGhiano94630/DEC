import { toVercel } from '../../server/http.js';
import { alternativeByIdHandler } from '../../server/handlers.js';

export default toVercel(alternativeByIdHandler);
