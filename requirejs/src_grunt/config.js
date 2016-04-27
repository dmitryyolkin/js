require.config({
    baseUrl: '.',
    paths: {
        'jquery': './components/jquery/jquery.min',
        'underscore': './components/underscore/underscore-min',

        'app': '.',
        //common is module name used in centralized task in Gruntfile.js
        //it's path to config
        //'common': 'common'
    },
    //для поддержки сторонних модулей описанных не через define
    shim: {
        underscore: {
            exports: '_'
        }
    }
});

// Load the main app module to start the app
requirejs(['./main']);
