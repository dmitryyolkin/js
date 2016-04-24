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
    //it's not clear what 'shim' tag does
    shim: {
        underscore: {
            exports: '_'
        }
    }
});
