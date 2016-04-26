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
            options: {
                'appDir': 'src_grunt',
                'dir': 'build',
                'mainConfigFile': 'src_grunt/config.js',
                'optimize': 'none',
                //'optimize': 'uglify2',
                'normalizeDirDefines': 'skip',
                'skipDirOptimize': true,
            },
            centralized: {
                options: {
                    'modules': [{
                        'name': 'main',
                        'include': [
                            'jquery',
                            'underscore',

                            //specify local files that should be included in build/main.js
                            'app/controllers/AddController',
                            'app/controllers/ListController',
                            'app/models/User',
                            'app/views/AddView',
                            'app/views/ListView',

                            'app/Router'
                        ]
                    }]
                }
            },

        //    independent: {
        //        options: {
        //            replaceRequireScript: [{
        //                files: ['build/hello.html'],
        //                module: 'app/hello/main',
        //                modulePath: 'app/hello/main'
        //            }, {
        //                files: ['build/world.html'],
        //                module: 'app/world/main',
        //                modulePath: 'app/world/main'
        //            }],
        //            'modules': [{
        //                name: 'app/hello/main',
        //                include: ['backbone', 'common'],
        //            }, {
        //                name: 'app/world/main',
        //                include: ['backbone', 'common'],
        //            }
        //            ],
        //        }
        //    },
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
    grunt.loadNpmTasks('grunt-requirejs');

    // Default task.
    grunt.registerTask('default', ['clean', 'requirejs']);
    //grunt.registerTask('default', ['jshint, centralized']);
};
