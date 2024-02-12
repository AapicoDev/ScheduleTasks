import './config.js'; // This loads the environment variables
import func from './main/src/main.js';

const req = {
    headers: {},
    payload: {}
};
const res = {
    send(text, status) {
        console.log(text, status);
    },
    json(obj, status) {
        console.log(obj, status);
    },
};

func({ req, res, log: console.log, error: console.error }).then();
