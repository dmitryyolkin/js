'use strict';

console.log('Get tag by name');
var ref = document.body.getElementsByTagName('a');
if (ref.length > 0){
    console.log(ref[0].href);
}else{
    console.log("'a' tag doesn't exist");
}
