/**
 * Created by yolkin on 22.04.2016.
 */

define(function(){
    var routes = [
        {hash: '#list', controller: 'ListController'},
        {hash: '#add', controller: 'AddController'}
    ];

    var defaultRoute = '#list';
    var currentHash = '';

    function _startRouting(){
        window.location.hash = window.location.hash | defaultRoute;
        setInterval(checkHash, 100);
    }

    function checkHash(){
        if (window.location.hash != currentHash){
            for (var i = 0; i < routes.length; i++){
                var currentRoute = routes[i];
                if (currentRoute.hash == window.location.hash){
                    loadController(currentRoute.controller);
                    break;
                }
            }
            currentHash = window.location.hash;
        }
    }

    function loadController(name){
        require(['controllers/' + name], function(controller){
            controller.start();
        })
    }

    return {
        startRouting: _startRouting
    }
});
