/**
 * Created by dmitry on 10.12.15.
 */
'use strict';

var fs = require('fs');
var path = './text.txt';

fs.writeFile(path, 'test files: bla-bla-bla', function(err){
    if (err){
        console.error(err);
    }
});

fs.readFile(
    path,
    'utf8',
    function(error, text){
        if (error){
            console.log(error);
        }else{
            console.log(text);
            //remove
            console.log('try to unlink');
            fs.unlink(path, function(err){
                if (!err){
                    console.log('file is removed: ' + path);
                }else{
                    console.error(err);
                }
            });
        }
    }
);
