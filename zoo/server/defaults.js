/**
 * Created by dmitry on 30.08.16.
 */
'use strict';

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

module.exports = {
    //mongo data store
    'db-uri': 'mongodb://localhost/zoo',

    //listen ports
    HTTP_PORT: normalizePort(process.env.PORT || 3000), //usually it's 80 but it requires elevated privileges for non root applications
    HTTPS_PORT: normalizePort(process.env.PORT || 4000) //usually it's 443 but it requires elevated privileges for non root applications
};
