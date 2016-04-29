/*global module:false*/
module.exports = function(grunt) {
    'use strict';

    // Project configuration.
    grunt.initConfig({
        // Metadata.
        pkg: grunt.file.readJSON('package.json'),

        // Task configuration.
        //jshint: {
        //    options: {
        //        jshintrc: '.jshintrc'
        //    },
        //    gruntfile: {
        //        src: 'Gruntfile.js'
        //    },
        //    sourcefiles: {
        //        src: ['src/**/*.js', '!src/app/bower_components/**/*.js']
        //    }
        //},

        //clean build directory
        clean: ['build'],
        requirejs: {
            //All possible values can be found here
            //https://github.com/requirejs/r.js/blob/master/build/example.build.js
            options: {
                'appDir': 'src_grunt',
                'dir': 'build',
                'mainConfigFile': 'src_grunt/config.js',
                'optimize': 'none',
                //'optimize': 'uglify2',
                //'normalizeDirDefines': 'skip',
                //'skipDirOptimize': true,
            },
            centralized: {
                options: {
                    //modules specifies what module should be optimized
                    //in name we specify name of JS file
                    'modules': [{
                        'name': 'config',
                        'include': [
                            'jquery',
                            'underscore',

                            //specify local files that should be included in build/main.js
                            //we don't include all other js files becasue they will be added automatically through require dependencies
                            'controllers/AddController',
                            'controllers/ListController'
                        ]
                    }]
                }
            },

            independent: {
                options: {
                    'modules': [{
                        name: 'main',
                        include: ['jquery', 'underscore']
                    }, {
                        name: 'Router',
                        include: ['controllers/AddController', 'controllers/ListController']
                    }
                    ],
                }
            },

        //
        //    shared: {
        //        options: {
        //            'modules': [{
        //                'name': 'common',
        //                'include': ['jquery',
        //                    'underscore',
        //                    'backbone',
        //                    'text',
        //                ],
        //            },
        //                {
        //                    'name': 'app/hello/main',
        //                    'exclude': ['common']
        //                },
        //                {
        //                    'name': 'app/world/main',
        //                    'exclude': ['common']
        //                }
        //            ],
        //        }
        //    },
        }
    });

    // These plugins provide necessary tasks.
    //grunt.loadNpmTasks('grunt-contrib-jshint');
    //clean build directory
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-requirejs');

    // Default task.
    //grunt.registerTask('default', ['clean', 'requirejs:centralized']);
    grunt.registerTask('default', ['clean', 'requirejs:independent']);
};
