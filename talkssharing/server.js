/**
 * Created by dmitry on 16.12.15.
 */
'use strict';

//=======Imports=======
var http = require('http');
var Router = require('./router');
var Helper = require('./helper');
var ecstatic = require('ecstatic'); //it's stable file server

//=======Variables=======
var talksPattern = /^\/talks\/([^\/]+)$/;
var fileServer = ecstatic({root: './public'});
var router = new Router();
var helper = new Helper();

var talks = Object.create(null);

{
    //=======Server=======
    var server = http.createServer(function(request, response){
        if (!router.resolve(request, response)){
            //file that should be put in public
            fileServer(request, response);
        }
    }).listen(8000);

    //=======init talks===
    helper.deserializeTalks(talks);
}


//=======Routes=======
//GET certain talk
router.add('GET', talksPattern, function(request, response, title){
    if (title in talks){
        helper.respondJSON(response, 200, talks[title]);
    }else{
        helper.respond(response, 404, 'No talk ' + title + ' found');
    }
});

//GET modified talks
router.add('GET', /^\/talks$/, function(request, response){
    //if passs true as second argument to parse url then 'query string' with params can be got
    var query = require('url').parse(request.url, true).query;
    if (query.changesSince == null){
        //get all; changes
        var list = [];
        for (var title in talks){
            list.push(talks[title]);
        }
        helper.sendTalks(list, response);
    }else{
        var since = Number(query.changesSince);
        if (isNaN(since)){
            helper.respond(response, 400, 'Invalid changesSince parameter value');
        }else{
            //long pulling request - wait for changes
            helper.wait4Changes(since, response);
        }
    }
});

router.add('DELETE', talksPattern, function(request, response, title){
    if (title in talks){
        delete talks[title];
        helper.registerChange(title, talks);
    }else{
        helper.respond(response, 404, 'No talk ' + title + ' found');
    }
});

router.add('PUT', talksPattern, function(request, response, title){
    helper.readStreamAsJSON(request, function(error, talk){
        //talk is JSON object parsed from input String
        if (error){
            helper.respond(response, 400, error.toString());
        }else if (!talk ||
            typeof talk.presenter != 'string' ||
            typeof talk.summary != 'string'){

            helper.respond(response, 400, 'Bad talks data');
        }else{
            //all is ok
            //it's not clear why we need to create new JSON object instead of assigning current talk to talks[title]
            talks[title] = {
                title: title,
                presenter: talk.presenter,
                summary: talk.summary,
                comments: []
            };
            helper.registerChange(title, talks);
            helper.respond(response, 204, null);
        }
    });
});

router.add('POST', /^\/talks\/([^\/]+)\/comments$/, function(request, response, title){
    helper.readStreamAsJSON(request, function(error, comment){
        if (error){
            helper.respond(response, 400, error.toString())
        }else if (!comment ||
            typeof comment.author != 'string' ||
            typeof comment.message != 'string'){

            helper.respond(response, 400, 'Bad comment data');
        }else if (title in talks){
            talks[title].comments.push(comment);

            helper.registerChange(title, talks);
            helper.respond(response, 204, null);
        }else{
            helper.respond(response, 404, 'No talk ' + title + ' found');
        }
    })
});
