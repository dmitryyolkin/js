require.config({
    baseUrl: '.',
    paths: {
        'jquery': './components/jquery/jquery.min',
        'underscore': './components/underscore/underscore-min'
    },

    //для поддержки сторонних модулей описанных не через define
    //если в данном случае убрать блок shim, то мы не сможем обращаться к
    //underscore через require('underscore')
    //напр-р, jQuery уже поддерживает стандарт AMD и его не обязательно описывать в блоке shim
    shim: {
        underscore: {
            exports: '_'
        }
    },
    deps: ['require'],
    callback: function(require){
        require(['./main']);
    }
});

// main.js can be loaded with this instruction or as we did with callback
//requirejs(['./main']);
