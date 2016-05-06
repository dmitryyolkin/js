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
                'optimize': 'none'
                //'optimize': 'uglify2',
                //'normalizeDirDefines': 'skip',
                //'skipDirOptimize': true,
            },
            centralized: {
                options: {
                    //modules specifies what module should be optimized
                    //in name we specify name of JS file

                    //As a result we have one main,js file including all files in itself in build directory
                    //All other files can be removed
                    'modules': [{
                        'name': 'main',
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
                    //in this scheme we will have two new modules
                    //  * controllers/list - it contains everything related to List users (without adding possibilities)
                    //      * main.js
                    //      * index.html
                    //  * controllers/add - it contains everything related to Add users (without listing possibilities)
                    //      * main.js
                    //      * index.html
                    'modules': [{
                        name: 'controllers/list/main',

                        'create': true, //allow to create new file
                        include: [
                            'jquery',
                            'underscore',
                            'main',
                            'controllers/ListController'
                        ]
                    },

                    //add config
                    {
                        name: 'controllers/add/main',

                        'create': true, //allow to create new file
                        include: [
                            'jquery',
                            'underscore',
                            'main',
                            'controllers/AddController'
                        ]
                    }]
                }
            },

            //common sources are in one js file
            //and separate resources in separate files without common
            shared: {
                options: {
                    //As a result we have in build directory
                    //  main.js with jQuery, _, User, Router
                    //  controllers
                    //      ListController including ListView
                    //      AddController including AddView
                    'modules': [
                        {
                            'name': 'main',
                            'include': ['jquery', 'underscore']
                        },
                        {
                            'name': 'controllers/ListController',
                            //ListView will be added automaticaly
                            'include': [],
                            'exclude': ['main']
                        },
                        {
                            'name': 'controllers/AddController',
                            //AddView will be added automaticaly
                            'include': [],
                            'exclude': ['main']
                        }
                    ]
                }
            }
        },

        //this task is needed for requirejs:independent only
        //replace path to components/requirejs and css in build/index.html

        //Potentially we don't need to replace something - all could be done with 'copy' plugin
        //requirejs and css could be copied to appropriate paths
        'string-replace': {
            dist: {
                files: [
                    {
                        expand: true,
                        cwd: 'build/',
                        src: 'index.html',
                        dest: 'build'
                    }
                ],
                options: {
                    replacements: [
                        {
                            pattern: 'components/requirejs/require.js',
                            replacement: '../../components/requirejs/require.js'
                        },
                        {
                            pattern: '../css/style.css',
                            replacement: '../../../css/style.css'
                        }]
                }
            }
        },

        copy: {
            //this task is needed for requirejs:independent only
            //we copy base src_grunt/index.html to build/controllers/list/index.html and build/controllers/add/index.html
            main: {
                files: [
                    //list index.html config
                    {
                        expand: true,
                        //cwd specifies src dir - without it index.html will be copied to scr_grunt/index.html
                        cwd: 'build/',
                        src: [
                            'index.html'
                        ],
                        dest: 'build/controllers/list'
                    },

                    //add index.html config
                    {
                        expand: true,
                        //cwd specifies src dir - without it index.html will be copied to scr_grunt/index.html
                        cwd: 'build/',
                        src: [
                            'index.html'
                        ],
                        dest: 'build/controllers/add'
                    }
                ]
            }
        }
    });

    // These plugins provide necessary tasks.
    //grunt.loadNpmTasks('grunt-contrib-jshint');
    //clean build directory
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-requirejs');

    //details regarding grunt-contrib-copy can be found http://grunt-tasks.com/grunt-contrib-copy/
    grunt.loadNpmTasks('grunt-contrib-copy');

    //details can be found https://www.npmjs.com/package/grunt-string-replace
    grunt.loadNpmTasks('grunt-string-replace');

    // Default task.
    //grunt.registerTask('default', ['clean', 'requirejs:centralized']);
    grunt.registerTask('default', ['clean', 'requirejs:independent', 'string-replace', 'copy']);
    //grunt.registerTask('default', ['clean', 'requirejs:shared']);
};
