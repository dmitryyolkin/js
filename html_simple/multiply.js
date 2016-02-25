'use strict';

console.log('5 * 7 =' + 5*7);

function parseTree(nodes){
    if (nodes.length == 0){
        return;
    }

    var thisLevelChildren = [];
    for (var i = 0; i < nodes.length; i++){
        var node = nodes[i];
        //nodeList doesn't have nodeType property
        //so we have some ugly hack here
        if (node instanceof NodeList){
            for(var j = 0; j < node.length; j++){
                thisLevelChildren.push(node[j]);
            }
            continue;
        }

        var nodeType = node.nodeType;
        if (nodeType == document.ELEMENT_NODE){
            //nodeType == 1
            thisLevelChildren.push(node.childNodes);
        }else if (nodeType == document.TEXT_NODE){
            //nodeType == 3
            //print text nodes
            console.log(node);
        }
    }
    return parseTree(thisLevelChildren);
}

var root = document.documentElement;
parseTree([root]);