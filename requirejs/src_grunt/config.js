require.config({
    baseUrl: 'components',
    paths: {
        'jquery': 'jquery/jquery.min',
        'underscore': 'underscore/underscore-min',

        'app': '..',
        //common is module name used in centralized task in Gruntfile.js
        //it's path to config
        'main': '../main'
    },
    //для поддержки сторонних модулей описанных не через define
    shim: {
        underscore: {
            exports: '_'
        }
    }
});
