/**
 * Created by dmitry on 18.12.15.
 */
'use strict';

var fs = require('fs');
var talksFilePath = './talks';

/**
 * This is helper class needed to combine list of additional functions
 */
var Helper = module.exports = function(){
    this.waiting = [];
    this.changes = [];
};

//internal functions
//I moved some functions from prototype to internal functions because
//these functions should be used internally within helper and exposed as external API
function _respond(response, status, data, type){
    response.writeHead(status, {"Content-Type" : type | "text|plain"});
    response.end(data);
}

function _respondJSON(response, status, data){
    _respond(response, status, JSON.stringify(data), "application/json");
}

function _sendTalks(talks, response){
    _respondJSON(
        response,
        200,
        {
            serverTime: Date.now(),
            talks: talks
        }
    )
}

/**
 * @return list of changed talks
 */
function _getChangedTalks(since, changes, talks){
    var found = [];
    function alreadySeen(title) {
        //some is a array method that returns true
        //if at least one array's element match with condition specified with function passed
        return found.some(function (f) {
            return f.title == title;
        });
    }

    for (var i = changes.length - 1; i >= 0; i--){
        var change = changes[i];
        var changeTitle = change.title;

        if (change.time <= since){
            break
        }
        if (alreadySeen(changeTitle)){
            continue;
        }

        if (changeTitle in talks){
            found.push(talks[changeTitle]);
        }else{
            found.push({title: changeTitle, deleted: true});
        }
    }
    return found;
}

function _serializeTalk(title, talks){
    var path = talksFilePath + '/' + decodeURIComponent(title);
    if (title in talks){
        var talk = talks[title];
        fs.writeFile(
            path,
            JSON.stringify(talk),
            function(error){
                if (error){
                    console.error("Can't serialize talk: " + error);
                }else{
                    console.log('Talk is serialized: ' + title);
                }
            }
        );
    }else{
        //remove talk
        fs.unlink(path, function(error){
            if (error){
                console.error("System can't remove file: " + error);
            }else{
                console.log('Talk is removed: ' + title);
            }
        });
    }
}

//Prototype
Helper.prototype = {
    
    respond: function(response, status, data, type){
        _respond(response, status, data, type)
    },

    respondJSON: function(response, status, data){
        _respondJSON(response, status, data)
    },

    readStreamAsJSON: function(stream, callback){
        var data = '';
        stream.on('data', function(chunk){
            data += chunk;
        });
        stream.on('end', function(){
            var error, result;
            try{
                result = JSON.parse(data);
            }catch (e){
                error = e;
            }
            callback(error, result);

        });
        stream.on('error', function(error){
            callback(error);
        });
    },

    /**
     * send talks to the client
     */
    sendTalks: function(talks, response){
        _sendTalks(talks, response)
    },

    /**
     * long - polling support
     * wait for 1.5 minutes to find changed talks
     */
    wait4Changes: function(since, response){
        var waiter = {
            since: since,
            response: response
        };

        var waiting = this.waiting;
        waiting.push(waiter);
        setTimeout(function(){

            var found = waiting.indexOf(waiter);
            if (found > -1){
                //if element is found then splite removes 1 found element
                waiting.splice(found, 1);
                _sendTalks([], waiter.response);
            }

        }, 90 * 1000);
    },


    /**
     * registrer new change
     * and clear waiting queue
     */
    registerChange: function(title, talks){
        var changes = this.changes;
        changes.push({
            title: title,
            time: Date.now()
        });

        _serializeTalk(title, talks);
        this.waiting.forEach(function(waiter){
            _sendTalks(_getChangedTalks(waiter.since, changes, talks), waiter.response);
        });
        //clear queue
        this.waiting = [];
    },

    /**
     * fill talks object with talks deserialized from DISC
     */
    deserializeTalks: function(talks) {
        fs.readdir(talksFilePath, function(error, files){
            if (error){
                console.error('There is an error of reading talks from disk: ' + error);
            }else{
                for(var i = 0; i < files.length; i++){
                    var file = files[i];
                    fs.readFile(
                        talksFilePath + '/' + file,
                        'utf8',
                        function(error, text){
                            if (error){
                                console.error("System can't deserialize talk: " + error);
                            }else{
                                var talk = JSON.parse(text);
                                talks[talk.title] = talk;
                            }
                        }
                    );
                }
            }
        });
    }

};