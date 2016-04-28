require.config({
    baseUrl: '.',
    paths: {
        'jquery': './components/jquery/jquery.min',
        'underscore': './components/underscore/underscore-min',

        //app is path relatively to baseUrl
        //we added 'app' variable to refer to it from GruntFile.js
        'app': ''
    },

    //для поддержки сторонних модулей описанных не через define
    //если в данном случае убрать блок shim, то мы не сможем обращаться к
    //underscore через require('underscore')
    //напр-р, jQuery уже поддерживает стандарт AMD и его не обязательно описывать в блоке shim
    shim: {
        underscore: {
            exports: '_'
        }
    }
});

// Load the main app module to start the app
requirejs(['./main']);
