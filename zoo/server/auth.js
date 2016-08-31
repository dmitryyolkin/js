/**
 * Created by dmitry on 29.08.16.
 */
'use strict';

module.exports = {

    //load user
    isUserLoggedIn: function(req, res, next) {
        //todo it looks like there is no prop user_id and req current User
        if (req.session.user_id) {
            User.findById(req.session.user_id, function (user) {
                if (user) {
                    req.currentUser = user;
                    next();
                } else {
                    res.redirect('/sessions/new');
                }
            });
        } else {
            res.redirect('/sessions/new');
        }
    }
};