/**
 * Created by dmitry on 23.12.15.
 */
'use strict';

var lastServerTime = 0;
var shownTalks = Object.create(null);
var talksDiv = document.querySelector('#talks');
var nameField = document.querySelector('#name');


{
    //====================== MAIN ===========================
    //it allows to represent user's value after reload page
    nameField.value = localStorage.getItem('name') || '';
    nameField.addEventListener('change', function(event){
        localStorage.setItem('name', nameField.value);
    });

    //new talk
    var talkForm = document.querySelector("#newtalk");
    talkForm.addEventListener('submit', function(event){
        event.preventDefault(); //prevent reloading form
        request(
            {
                pathname: talkURL(talkForm.elements.title.value),
                method: 'PUT',
                body: JSON.stringify({
                    presenter: nameField.value,
                    summary: talkForm.elements.summary.value
                })
            },
            reportError
        );
        //reset form fields
        talkForm.reset();
    });

    //get talks
    request({pathname: 'talks'}, function (error, response) {
        if (error) {
            reportError(error);
        } else {
            response = JSON.parse(response);
            displayTalks(response.talks);
            lastServerTime = response.serverTime;
            wait4Changes();
        }
    });

}

/**
 * =================== Requests ==============================
 */
function request(options, callback){
    var request = new XMLHttpRequest();
    request.open(options.method || 'GET', options.pathname, true);
    request.addEventListener('load', function(event){
        if (request.status < 400){
            callback(null, request.responseText);
        }else{
            callback(new Error('Request failed: ' + request.statusText));
        }
    });

    request.addEventListener('error', function(){
        callback(new Error('Network error'));
    });
    request.send(options.body || null);
}

function reportError(error){
    if (error){
        alert(error.toString());
    }
}

function deleteTalk(title){
    request(
        {
            pathname: talkURL(title),
            method: "DELETE"
        },
        reportError
    );
}

function addComment(title, comment){
    request(
        {
            pathname: talkURL(title) + '/comments',
            method: 'POST',
            body: JSON.stringify({
                author: nameField.value,
                message: comment
            })
        },
        reportError
    );
}

function talkURL(title){
    return 'talks/' + encodeURIComponent(title);
}

function wait4Changes(){
    request(
        {pathname: 'talks?changesSince=' + lastServerTime},
        function(error, response){
            if (error){
                setTimeout(wait4Changes, 2500);
                console.error(error.stack);
            }else{
                response = JSON.parse(response);
                displayTalks(response.talks);
                lastServerTime = response.serverTime;
                wait4Changes();
            }
        }
    )
}

/**
 * =================== Drawing the talk ==================
 */
function displayTalks(talks){
    talks.forEach(function(talk){
        var talkTitle = talk.title;
        var shown = shownTalks[talkTitle];
        if (talk.deleted){
            if (shown){
                talksDiv.removeChild(shown);
                delete shownTalks[talkTitle];
            }
        }else{
            var node = drawTalk(talk, shown);
            if (shown){
                talksDiv.replaceChild(node, shown);
            }else{
                talksDiv.appendChild(node);
            }
            shownTalks[talkTitle] = node;
        }
    });
}

function drawTalk(talk, currentTalk){
    var node = instantiateTemplate('talk', talk);
    node.querySelector('button.del').addEventListener(
        'click',
        deleteTalk.bind(null, talk.title)
    );

    //form for adding a new comment
    var form = node.querySelector('form');
    form.addEventListener('submit', function(event){
        //prevent reloading the screen
        event.preventDefault();
        addComment(talk.title, form.elements.comment.value);
        form.reset();//reset all values entered by user
    });

    //keep comments entered by user at the moment
    if (currentTalk){
        var currentComment = currentTalk.querySelector('form').elements.comment.value;
        if (currentComment.length > 0){
            form.elements.comment.value = currentComment;
            console.log('Current comments is saved: ' + currentComment);
        }
    }
    return node;

}

function instantiateTemplate(name, initialValues){
    function instantiateText(text, values){
        return text.replace(/\{\{(\w+)\}\}/g, function(_, name){
            return values[name];
        });
    }

    function instantiate(node, values){
        var nodeType = node.nodeType;
        if (nodeType == document.ELEMENT_NODE){
            //in this case we clone node without child elements
            var copy = node.cloneNode();
            for(var i = 0; i < node.childNodes.length; i++){
                var childNode = node.childNodes[i];

                var isComment = false;
                if (childNode.nodeType == document.ELEMENT_NODE){
                    var commentsAttr = childNode.getAttribute('template-repeat');
                    if (commentsAttr){
                        isComment = true;
                        var comments = values[commentsAttr];
                        comments.forEach(function(comment){
                            //it's a commment
                            copy.appendChild(instantiate(childNode, comment));
                        });

                    }
                }

                if (!isComment){
                    copy.appendChild(instantiate(childNode, values));
                }
            }
            return copy;
        }else if (nodeType == document.TEXT_NODE){
            return document.createTextNode(instantiateText(node.nodeValue, values));
        }
        return node;
    }

    var template = document.querySelector("#template ." + name);
    return instantiate(template, initialValues);
}

