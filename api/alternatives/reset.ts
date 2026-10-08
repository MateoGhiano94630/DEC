import { toVercel } from '../../server/http.js';
import { resetHandler } from '../../server/handlers.js';

export default toVercel(resetHandler);
