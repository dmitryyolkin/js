/**
 * Created by dmitry on 13.05.16.
 */
require.config({
    baseUrl: '.',
    paths: {
        'jquery': '../static/components/jQuery/dist/jquery.min',
        'underscore': '../static/components/underscore/underscore-min',
        'Backbone': '../static/components/backbone/backbone-min'
    },

    //для поддержки сторонних модулей описанных не через define
    //если в данном случае убрать блок shim, то мы не сможем обращаться к
    //underscore через require('underscore')
    //напр-р, jQuery уже поддерживает стандарт AMD и его не обязательно описывать в блоке shim
    shim: {
        underscore: {
            exports: '_'
        },
        Backbone: {
            deps: ["underscore", "jquery"],
            exports: "Backbone"
        }
    },
    deps: ['require'],
    callback: function(require){
        //this construction helps to specify main.js with all dependencies in 'define' section
        //when grunt requirejs:task is executed
        require(['./main']);
    }
});

// main.js can be loaded with this instruction or as we did with callback
//requirejs(['./main']);
